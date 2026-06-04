import { useState, useMemo, useRef, useEffect } from "react";
import CustomSelect from "../components/CustomSelect";
import AudioPlayer from "../components/AudioPlayer";
import { startAudioGeneration, startVoxCPMGeneration, checkAudioStatus } from "../api/ttsApi";
// NEW: reference-clip cloned voices use their own API + status endpoint.
import { generateWithVoiceProfile, getTaskStatus, getVoiceProfiles } from "../api/voiceProfileApi";
// NEW: VoxCPM2 voices live on a SEPARATE server (synchronous, returns audio directly).
import { generateVoxCPM2Audio } from "../api/voxcpm2Api";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import "./Home.css";

/**
 * Short Khmer sample sentences shown as clickable "starter" chips on landing.
 * These are TTS test inputs, so they stay in Khmer regardless of UI language.
 */
const KHMER_EXAMPLES = [
  "សួស្តី! តើអ្នកសុខសប្បាយជាទេ?",
  "ខ្ញុំស្រឡាញ់ប្រទេសកម្ពុជា។",
  "ថ្ងៃនេះអាកាសធាតុល្អណាស់។",
  "សូមអរគុណសម្រាប់ការជួយរបស់អ្នក។",
  "តើផ្លូវទៅផ្សារនៅឯណា?",
  "អក្សរសិល្ប៍ខ្មែរមានប្រវត្តិយូរលង់ណាស់។",
];

/**
 * Legacy LoRA voices that run through the VoxCPM LoRA backend (/voxcpm/generate).
 * These are NOT reference-clip clones — keep them on the existing path so they
 * keep working exactly as before. "soriyan" is the non-clone VITS2 path.
 */
const VOXCPM_VOICES = new Set(["male_report", "storyteller", "sokky"]);

/**
 * NEW VoxCPM2 voices. These run on a DIFFERENT server (VITE_VOXCPM2_BASE_URL)
 * and return audio synchronously — no task id, no polling. The key is the UI
 * option value; the value is the backend voice id. Legacy paths are untouched.
 *   Model A = Stories Teller -> speaker_a
 *   Model B = Male           -> speaker_b
 */
const VOXCPM2_MODELS = {
  model_a: "speaker_a",
  model_b: "speaker_b",
};

/**
 * Home Component - Main TTS Interface.
 * All visible strings come from useTranslation() so the UI reacts to the
 * language picker in the topbar.
 */
export default function Home() {
  const { t } = useTranslation();

  const [text, setText] = useState("");
  const [model, setModel] = useState("soriyan");
  const [voice, setVoice] = useState("the-documentarian");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  // NEW: user-created reference-clip voices (UUID ids), fetched from backend.
  const [customVoices, setCustomVoices] = useState([]);
  const maxLength = 5000;

  const textareaRef = useRef(null);

  // NEW: load custom cloned voices once on mount. Built-in/legacy voices are
  // filtered out here because they are already listed as static options below.
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

  const handleClearText = () => {
    setText("");
    setAudioUrl(null);
    setError(null);
  };

  // Fill the composer with a sample sentence and focus it for editing.
  const handlePickExample = (sample) => {
    setText(sample);
    setAudioUrl(null);
    setError(null);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(sample.length, sample.length);
      }
    });
  };

  // Each voice has a UNIQUE value so the backend can tell them apart.
  // Static options (VITS2 + legacy LoRA) first, then any custom cloned voices.
  const modelOptions = useMemo(
    () => [
      { value: "soriyan", label: "Soriyan" },           // VITS2 path (/generate)
      { value: "male_report", label: "Male Report" },   // legacy LoRA clone
      { value: "storyteller", label: "Stories Teller" },// legacy LoRA clone
      { value: "sokky", label: "Sokky" },               // legacy LoRA clone
      { value: "model_a", label: "Stories Teller (Model A)" }, // NEW VoxCPM2 server
      { value: "model_b", label: "Male (Model B)" },           // NEW VoxCPM2 server
      ...customVoices.map((v) => ({ value: v.id, label: v.name })), // NEW
    ],
    [customVoices]
  );

  const voiceOptions = useMemo(
    () => [
      { value: "the-documentarian", label: t("voice.shortAudio") },
      { value: "the-storyteller", label: t("voice.audioBook"), disabled: true },
      { value: "the-news-anchor", label: t("voice.storyTelling"), disabled: true },
    ],
    [t]
  );

  /**
   * Extracts audio URL from response data. Tries multiple field names because
   * the backend contract has shifted over time. Converts relative paths to full URLs.
   */
  const extractAudioUrl = (data) => {
    if (!data) return null;
    const audioUrlFields = [
      "stage4_audio_url",
      "audio_url",
      "url",
      "audioUrl",
      "audio",
      "file_url",
      "file",
    ];
    for (const field of audioUrlFields) {
      if (data[field]) {
        const url = data[field];
        // Convert relative paths to full URLs
        if (url.startsWith('/')) {
          return `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${url}`;
        }
        return url;
      }
    }
    if (typeof data === "string") {
      if (data.startsWith('/')) {
        return `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${data}`;
      }
      return data;
    }
    return null;
  };

  const handleGenerateSpeech = async () => {
    if (!text.trim()) {
      setError(t("error.empty"));
      return;
    }

    setIsGenerating(true);
    setAudioUrl(null);
    setError(null);

    try {
      // NEW: VoxCPM2 server returns audio directly — no task id, no polling.
      // Handle it first and bail out; the legacy flow below is untouched.
      if (model in VOXCPM2_MODELS) {
        const voice = VOXCPM2_MODELS[model];
        console.log("📝 Sending text to VoxCPM2 server... voice:", voice);
        const url = await generateVoxCPM2Audio(text, voice);
        console.log("✅ VoxCPM2 audio ready:", url);
        setAudioUrl(url);
        return; // finally{} still runs and resets isGenerating
      }

      const isVits2 = model === "soriyan";
      const isLegacyVox = VOXCPM_VOICES.has(model); // legacy LoRA voices
      // Anything else is a custom reference-clip profile (UUID id).
      const isCustomProfile = !isVits2 && !isLegacyVox;

      console.log("📝 Sending text to backend... voice:", model, { isVits2, isLegacyVox, isCustomProfile });

      // Route to the correct backend.
      let taskId;
      if (isVits2) {
        taskId = await startAudioGeneration(text);
      } else if (isLegacyVox) {
        taskId = await startVoxCPMGeneration(text, model);
      } else {
        const res = await generateWithVoiceProfile(model, text);
        taskId = res.task_id; // new API returns { task_id }
      }
      console.log("✅ Task ID received:", taskId);

      // Custom profiles report status on /voice-profiles/tasks/:id, the others
      // on the existing /status/:id endpoint.
      const statusFn = isCustomProfile ? getTaskStatus : checkAudioStatus;

      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        console.log(`🔄 Status check attempt ${attempts}/${maxAttempts}...`);
        const statusData = await statusFn(taskId);

        if (statusData.status === "completed") {
          const audioUrlFromServer =
            extractAudioUrl(statusData?.data) || extractAudioUrl(statusData);

          if (audioUrlFromServer) {
            console.log("✅ Audio generated successfully!");
            console.log("📁 Audio URL:", audioUrlFromServer);
            setAudioUrl(audioUrlFromServer);
            break;
          } else {
            console.warn("⚠️ Completed but no audio URL found. Response:", statusData);
            throw new Error(t("error.noUrl"));
          }
        }

        if (statusData.status === "failed") {
          throw new Error(statusData.error || t("error.backendFailed"));
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error(t("error.timeout"));
      }
    } catch (err) {
      console.error("❌ Audio generation error:", err.message);
      setError(err.message || t("error.generic"));
    } finally {
      setIsGenerating(false);
    }
  };

  const showExamples = text.trim().length === 0;

  return (
    <main className="home-wrapper">
      <div className="home-content">
        {/* Model & Voice Selection */}
        <div className="home-controls">
          <div className="home-control-group">
            <label htmlFor="model-select">{t("controls.aiModel")}</label>
            <CustomSelect
              id="model-select"
              value={model}
              options={modelOptions}
              onChange={setModel}
            />
          </div>

          <div className="home-control-group">
            <label htmlFor="voice-select">{t("controls.voice")}</label>
            <CustomSelect
              id="voice-select"
              value={voice}
              options={voiceOptions}
              onChange={setVoice}
            />
          </div>
        </div>

        {/* Composer: textarea + footer (counter + actions) */}
        <div className="home-input-section">
          <label htmlFor="tts-input">{t("input.label")}</label>
          <div className="textarea-container">
            <textarea
              id="tts-input"
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLength))}
              placeholder={t("input.placeholder")}
              rows={8}
              disabled={isGenerating}
              aria-label={t("input.label")}
            />

            <div className="composer-footer">
              <span className="char-counter" aria-live="polite">
                {text.length} / {maxLength}
              </span>
              <div className="home-actions">
                <button
                  className="icon-btn reset-btn"
                  onClick={handleClearText}
                  disabled={isGenerating || text.length === 0}
                  title={t("action.clearTitle")}
                  aria-label={t("action.clear")}
                >
                  {t("action.clear")}
                </button>

                <button
                  className={`generate-btn ${isGenerating ? "generating" : ""}`}
                  disabled={text.trim().length === 0 || isGenerating}
                  onClick={handleGenerateSpeech}
                  aria-label={isGenerating ? t("action.generating") : t("action.generate")}
                >
                  {isGenerating && <span className="generate-btn__spinner" aria-hidden="true" />}
                  {isGenerating ? t("action.generating") : t("action.generate")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Example chips — starter prompts shown while the composer is empty */}
        {showExamples && (
          <div className="home-examples">
            <span className="home-examples__label">{t("home.tryExample")}</span>
            <div className="home-examples__chips">
              {KHMER_EXAMPLES.map((sample, i) => (
                <button
                  key={sample}
                  type="button"
                  className="example-chip"
                  style={{ "--chip-i": i }}
                  onClick={() => handlePickExample(sample)}
                  disabled={isGenerating}
                  lang="km"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* Audio Player */}
        {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
      </div>
    </main>
  );
}