import { useState, useMemo, useRef } from "react";
import CustomSelect from "../components/CustomSelect";
import AudioPlayer from "../components/AudioPlayer";
import { startAudioGeneration, startVoxCPMGeneration, checkAudioStatus } from "../api/ttsApi";
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
 * Home Component - Main TTS Interface.
 * All visible strings come from useTranslation() so the UI reacts to the
 * language picker in the topbar.
 */
export default function Home() {
  const { t } = useTranslation();

  const [text, setText] = useState("");
  const [model, setModel] = useState("khmer-cambodia");
  const [voice, setVoice] = useState("the-documentarian");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const maxLength = 5000;

  const textareaRef = useRef(null);

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

  // Rebuild option arrays whenever the language changes so labels stay localized.
  const modelOptions = useMemo(
    () => [
      { value: "khmer-cambodia", label: "Soriya" }, // VITS2 - proper noun, not translated
      { value: "multilingual", label: "Sokkha" },   // VoxCPM - proper noun, not translated
    ],
    []
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
      console.log("📝 Sending text to backend...");

      const taskId =
        model === "multilingual"
          ? await startVoxCPMGeneration(text)
          : await startAudioGeneration(text);
      console.log("✅ Task ID received:", taskId);

      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        console.log(`🔄 Status check attempt ${attempts}/${maxAttempts}...`);
        const statusData = await checkAudioStatus(taskId);

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
          throw new Error(t("error.backendFailed"));
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
        {/* Landing header */}
        <header className="home-hero">
          <span className="home-hero__eyebrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2.5 8h1.2M5.5 5.5v5M8 3v10M10.5 5.5v5M13 7v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Khmer TTS
          </span>
          <h1 className="home-hero__title">{t("home.title")}</h1>
          <p className="home-hero__subtitle">{t("home.subtitle")}</p>
        </header>

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