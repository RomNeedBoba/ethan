import React, { useState, useMemo } from "react";
import CustomSelect from "../components/CustomSelect";
import AudioPlayer from "../components/AudioPlayer";
import { startVoxCPMGeneration, checkAudioStatus } from "../api/ttsApi";
import { useTranslation } from "../i18n/LanguageContext.jsx";
import "./Home.css";

/**
 * Home Component - Main TTS Interface.
 * All visible strings come from useTranslation() so the UI reacts to the
 * language picker in the topbar.
 */
export default function Home() {
  const { t } = useTranslation();

  const [text, setText] = useState("");
  const [model, setModel] = useState("soriya");
  const [voice, setVoice] = useState("the-documentarian");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const maxLength = 5000;

  const handleClearText = () => {
    setText("");
    setAudioUrl(null);
    setError(null);
    setProcessingStatus("");
  };

  // Model options with proper names
  const modelOptions = useMemo(
    () => [
      { value: "soriya", label: "🎙️ Soriya (VITS2)" },
      { value: "reporter", label: "📰 Reporter (VoxCPM)" },
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
   * the backend contract has shifted over time.
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
      if (data[field]) return data[field];
    }
    if (typeof data === "string") return data;
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
    setProcessingStatus("Queuing audio generation...");

    try {
      console.log("📝 Sending text to backend...");
      console.log(`🎯 Model: ${model}`);

      const taskId =
        model === "reporter"
          ? await startReporterGeneration(text)
          : await startAudioGeneration(text);
      
      console.log("✅ Task ID received:", taskId);
      setProcessingStatus("Waiting for audio generation...");

      let attempts = 0;
      const maxAttempts = 120; // 10 minutes with 5s intervals

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        const attemptsRemaining = maxAttempts - attempts;
        setProcessingStatus(
          `Processing... (${attempts}/${maxAttempts}) - ~${Math.ceil(attemptsRemaining * 5 / 60)}min remaining`
        );

        console.log(`🔄 Status check attempt ${attempts}/${maxAttempts}...`);
        const statusData = await checkAudioStatus(taskId);

        console.log(`Status: ${statusData.status}`, statusData.data);

        if (statusData.status === "completed") {
          const audioUrlFromServer =
            extractAudioUrl(statusData?.data) || extractAudioUrl(statusData);

          if (audioUrlFromServer) {
            console.log("✅ Audio generated successfully!");
            console.log("📁 Audio URL:", audioUrlFromServer);
            setProcessingStatus("Audio ready!");
            setAudioUrl(audioUrlFromServer);
            break;
          } else {
            console.warn("⚠️ Completed but no audio URL found. Response:", statusData);
            throw new Error(t("error.noUrl"));
          }
        }

        if (statusData.status === "failed") {
          const errorMsg = statusData.data?.error || t("error.backendFailed");
          throw new Error(errorMsg);
        }

        if (statusData.status === "processing") {
          setProcessingStatus(
            `Generating audio... (${attempts}/${maxAttempts}) - ~${Math.ceil(attemptsRemaining * 5 / 60)}min remaining`
          );
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error(t("error.timeout"));
      }
    } catch (err) {
      console.error("❌ Audio generation error:", err.message);
      setError(err.message || t("error.generic"));
      setProcessingStatus("");
    } finally {
      setIsGenerating(false);
    }
  };

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

        {/* Text Input Section */}
        <div className="home-input-section">
          <label htmlFor="tts-input">{t("input.label")}</label>
          <div className="textarea-container">
            <textarea
              id="tts-input"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLength))}
              placeholder={t("input.placeholder")}
              rows={8}
              disabled={isGenerating}
              aria-label={t("input.label")}
            />
            <div className="char-counter" aria-live="polite">
              {text.length} / {maxLength}
            </div>
          </div>
        </div>

        {/* Processing Status */}
        {processingStatus && (
          <div className="processing-status" role="status">
            <div className="spinner"></div>
            <span>{processingStatus}</span>
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

        {/* Action Buttons */}
        <div className="home-actions">
          <button
            className="icon-btn reset-btn"
            onClick={handleClearText}
            disabled={isGenerating}
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
            {isGenerating ? t("action.generating") : t("action.generate")}
          </button>
        </div>
      </div>
    </main>
  );
}
