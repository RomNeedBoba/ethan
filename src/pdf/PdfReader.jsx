import { useState, useCallback, useMemo, useRef } from "react";
import { pdfjs } from "react-pdf"; // <-- 1. ADDED: Import the library

// <-- 2. ADDED: The Global Worker Fix -->
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

import CustomSelect from "../components/CustomSelect.jsx";
import PdfViewer from "./PdfViewer.jsx";
import ConversationSidebar from "./ConversationSidebar.jsx";
import {
  startAudioGeneration,
  startVoxCPMGeneration,
  checkAudioStatus,
} from "../api/ttsApi.js";
import { t } from "./strings.js";
import "./PdfReader.css";

const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60;

const extractAudioUrl = (data) => {
  if (!data) return null;
  const fields = [
    "stage4_audio_url", "audio_url", "url", "audioUrl",
    "audio", "file_url", "file",
  ];
  for (const f of fields) {
    if (data[f]) return data[f];
  }
  if (typeof data === "string") return data;
  return null;
};

/**
 * AudioBook screen.
 * Left  → PDF viewer with selection-driven "Generate audio" button
 * Right → Model picker (sticky) + chat-style conversation of generations
 */
export default function PdfReader({ language = "en" }) {
  const [model, setModel] = useState("khmer-cambodia");
  const [items, setItems] = useState([]);
  const nextIdRef = useRef(1);

  const modelOptions = useMemo(
    () => [
      { value: "khmer-cambodia", label: "Soriya" },
      { value: "multilingual", label: "Sokkha" },
    ],
    []
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
        const taskId =
          modelValue === "multilingual"
            ? await startVoxCPMGeneration(text)
            : await startAudioGeneration(text);

        let attempts = 0;
        while (attempts < MAX_POLL_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          attempts++;

          const statusData = await checkAudioStatus(taskId);

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
            throw new Error(t(language, "err.backendFailed"));
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