import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import CustomSelect from "../components/CustomSelect.jsx";
import PdfViewer from "./PdfViewer.jsx";
import ConversationSidebar from "./ConversationSidebar.jsx";
import {
  startAudioGeneration,
  startVoxCPMGeneration,
  checkAudioStatus,
} from "../api/ttsApi.js";
// SYNC with Home.jsx: custom reference-clip voices + VoxCPM2 server.
import {
  generateWithVoiceProfile,
  getTaskStatus,
  getVoiceProfiles,
} from "../api/voiceProfileApi";
import { generateVoxCPM2Audio } from "../api/voxcpm2Api";
import { t } from "./strings.js";
import "./PdfReader.css";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60;

/**
 * Legacy LoRA voices that run through the VoxCPM LoRA backend (/voxcpm/generate).
 * Kept identical to Home.jsx so both screens route the same way.
 */
const VOXCPM_VOICES = new Set(["sokky"]);

/**
 * VoxCPM2 voices — separate server (VITE_VOXCPM2_BASE_URL), synchronous,
 * returns audio directly. No task id, no polling. Same map as Home.jsx.
 *   Model A = Stories Teller -> speaker_a
 *   Model B = Male           -> speaker_b
 */
const VOXCPM2_MODELS = {
  model_a: "speaker_a",
  model_b: "speaker_b",
};

/**
 * Same as Home.jsx: tries multiple field names and converts relative
 * paths to full URLs against the proxy base.
 */
const extractAudioUrl = (data) => {
  if (!data) return null;
  const fields = [
    "stage4_audio_url", "audio_url", "url", "audioUrl",
    "audio", "file_url", "file",
  ];
  const toFullUrl = (url) =>
    url.startsWith("/")
      ? `${import.meta.env.VITE_API_BASE_URL.replace("/api", "")}${url}`
      : url;

  for (const f of fields) {
    if (data[f]) return toFullUrl(data[f]);
  }
  if (typeof data === "string") return toFullUrl(data);
  return null;
};

/**
 * AudioBook screen.
 * Left  → PDF viewer with selection-driven "Generate audio" button
 * Right → Model picker (sticky) + chat-style conversation of generations
 *
 * Model values/labels and backend routing are kept in sync with Home.jsx:
 *   soriyan  = Women V1 (VITS2, /generate)
 *   sokky    = Men V1   (legacy LoRA, /voxcpm/generate)
 *   model_a  = Women V2 (VoxCPM2 server, synchronous)
 *   model_b  = Men V2   (VoxCPM2 server, synchronous)
 *   <uuid>   = custom reference-clip profiles (voice-profiles API)
 */
export default function PdfReader({ language = "en" }) {
  const [model, setModel] = useState("soriyan");
  const [items, setItems] = useState([]);
  // SYNC with Home.jsx: user-created reference-clip voices (UUID ids).
  const [customVoices, setCustomVoices] = useState([]);
  const nextIdRef = useRef(1);

  // Load custom cloned voices once on mount; built-ins are already static options.
  useEffect(() => {
    let alive = true;
    getVoiceProfiles()
      .then((list) => {
        if (alive) setCustomVoices(list.filter((v) => !v.builtin));
      })
      .catch((err) => console.warn("Could not load custom voices:", err.message));
    return () => {
      alive = false;
    };
  }, []);

  const modelOptions = useMemo(
    () => [
      { value: "soriyan", label: "Women V1" },          // VITS2 path (/generate)
      { value: "sokky", label: "Men V1" },              // legacy LoRA clone
      { value: "model_a", label: "Women V2" },          // VoxCPM2 server (storyteller)
      { value: "model_b", label: "Men V2" },            // VoxCPM2 server (reporter)
      ...customVoices.map((v) => ({ value: v.id, label: v.name })),
    ],
    [customVoices]
  );

  const modelLabel = useCallback(
    (value) => modelOptions.find((m) => m.value === value)?.label || value,
    [modelOptions]
  );

  const patchItem = useCallback((id, patch) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  const runGeneration = useCallback(
    async (id, text, modelValue) => {
      try {
        // VoxCPM2 server returns audio directly — no task id, no polling.
        if (modelValue in VOXCPM2_MODELS) {
          const voice = VOXCPM2_MODELS[modelValue];
          const url = await generateVoxCPM2Audio(text, voice);
          patchItem(id, { status: "done", audioUrl: url });
          return;
        }

        const isVits2 = modelValue === "soriyan";
        const isLegacyVox = VOXCPM_VOICES.has(modelValue);
        // Anything else is a custom reference-clip profile (UUID id).
        const isCustomProfile = !isVits2 && !isLegacyVox;

        // Route to the correct backend (same as Home.jsx).
        let taskId;
        if (isVits2) {
          taskId = await startAudioGeneration(text);
        } else if (isLegacyVox) {
          taskId = await startVoxCPMGeneration(text, modelValue);
        } else {
          const res = await generateWithVoiceProfile(modelValue, text);
          taskId = res.task_id; // new API returns { task_id }
        }

        // Custom profiles report status on /voice-profiles/tasks/:id,
        // the others on the existing /status/:id endpoint.
        const statusFn = isCustomProfile ? getTaskStatus : checkAudioStatus;

        let attempts = 0;
        while (attempts < MAX_POLL_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          attempts++;

          const statusData = await statusFn(taskId);

          if (statusData.status === "completed") {
            const url =
              extractAudioUrl(statusData?.data) || extractAudioUrl(statusData);
            if (url) {
              patchItem(id, { status: "done", audioUrl: url });
              return;
            }
            throw new Error(t(language, "err.noUrl"));
          }
          if (statusData.status === "failed") {
            throw new Error(statusData.error || t(language, "err.backendFailed"));
          }
        }
        throw new Error(t(language, "err.timeout"));
      } catch (err) {
        console.error("AudioBook generation error:", err);
        patchItem(id, {
          status: "error",
          error: err.message || t(language, "err.generic"),
        });
      }
    },
    [patchItem, language]
  );

  const handleGenerate = useCallback(
    (text) => {
      const id = `c-${nextIdRef.current++}`;
      const newItem = {
        id,
        text,
        model,
        modelLabel: modelLabel(model),
        status: "pending",
        audioUrl: null,
        error: null,
      };
      setItems((prev) => [...prev, newItem]);
      runGeneration(id, text, model);
    },
    [model, modelLabel, runGeneration]
  );

  const handleDelete = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const handleRetry = useCallback(
    (id) => {
      setItems((prev) => {
        const target = prev.find((it) => it.id === id);
        if (!target) return prev;
        const updated = prev.map((it) =>
          it.id === id ? { ...it, status: "pending", error: null } : it
        );
        queueMicrotask(() => runGeneration(id, target.text, target.model));
        return updated;
      });
    },
    [runGeneration]
  );

  const handleClearAll = useCallback(() => setItems([]), []);

  return (
    <main className="pdfr">
      <section className="pdfr__main">
        <PdfViewer language={language} onGenerate={handleGenerate} />
      </section>

      <section className="pdfr__side">
        <div className="pdfr__side-top">
          <label htmlFor="pdf-model-select" className="pdfr__side-label">
            {t(language, "controls.aiModel")}
          </label>
          <CustomSelect
            id="pdf-model-select"
            value={model}
            options={modelOptions}
            onChange={setModel}
          />
        </div>

        <ConversationSidebar
          language={language}
          items={items}
          onDelete={handleDelete}
          onRetry={handleRetry}
          onClearAll={handleClearAll}
        />
      </section>
    </main>
  );
}
