import React, { useState } from "react";
import CustomSelect from "../components/CustomSelect";
import AudioPlayer from "../components/AudioPlayer";
import { startAudioGeneration, checkAudioStatus } from "../api/ttsApi";
import "./Home.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const LOCALHOST_AUDIO_PATTERN = /^http:\/\/(?:127\.0\.0\.1|localhost|::1)(?::\d+)?/i;

const getPublicAudioBase = () => {
  if (!API_BASE_URL) return null;

  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return null;
  }
};

const normalizeAudioUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  const publicAudioBase = getPublicAudioBase();
  const rewritten = LOCALHOST_AUDIO_PATTERN.test(rawUrl) && publicAudioBase
    ? rawUrl.replace(LOCALHOST_AUDIO_PATTERN, publicAudioBase)
    : rawUrl;

  if (window.location.protocol === "https:" && rewritten.startsWith("http://")) {
    console.error("Blocked insecure audio URL on HTTPS page:", rewritten);
    return null;
  }

  return rewritten;
};

export default function Home() {
  const [text, setText] = useState("");
  const [model, setModel] = useState("khmer-cambodia");
  const [voice, setVoice] = useState("the-documentarian");
  const maxLength = 500;

  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const handleClearText = () => {
    setText("");
    setAudioUrl(null);
  };

  const modelOptions = [
    { value: "khmer-cambodia", label: "Soriya" },
    { value: "multilingual", label: "Sokkha", disabled: true },
  ];

  const voiceOptions = [
    { value: "the-documentarian", label: "Short Audio" },
    { value: "the-storyteller", label: "AudioBook", disabled: true },
    { value: "the-news-anchor", label: "Story Telling", disabled: true },
  ];

  const handleGenerateSpeech = async () => {
    if (!text.trim()) return;

    setIsGenerating(true);
    setAudioUrl(null);

    try {
      console.log("1. Sending text to backend...");

      const taskId = await startAudioGeneration(text, model, voice);

      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const statusData = await checkAudioStatus(taskId);

        if (statusData.status === "completed") {
          const raw = statusData?.data?.stage4_audio_url;
          const finalAudioUrl = normalizeAudioUrl(raw);

          if (!finalAudioUrl) {
            alert("Audio is ready but the URL is not playable in this environment.");
            break;
          }

          setAudioUrl(finalAudioUrl);
          break;
        }

        if (statusData.status === "failed") {
          alert("Failed to generate audio. Please try again.");
          break;
        }
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("Error connecting to the backend.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="home-wrapper">
      <div className="home-content">
        <div className="home-controls">
          <div className="home-control-group">
            <label htmlFor="model-select">AI Model</label>
            <CustomSelect
              id="model-select"
              value={model}
              options={modelOptions}
              onChange={setModel}
            />
          </div>

          <div className="home-control-group">
            <label htmlFor="voice-select">Voice</label>
            <CustomSelect
              id="voice-select"
              value={voice}
              options={voiceOptions}
              onChange={setVoice}
            />
          </div>
        </div>

        <div className="home-input-section">
          <label htmlFor="tts-input">Text to Speech</label>
          <div className="textarea-container">
            <textarea
              id="tts-input"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, maxLength))}
              placeholder="Type Khmer text here..."
              rows={8}
              disabled={isGenerating}
            />
            <div className="char-counter">
              {text.length} / {maxLength}
            </div>
          </div>
        </div>

        {audioUrl && <AudioPlayer audioUrl={audioUrl} />}

        <div className="home-actions">
          <div className="actions-left"></div>

          <div className="actions-right">
            <button
              className="icon-btn reset-btn"
              onClick={handleClearText}
              disabled={isGenerating}
              title="Clear text"
            >
              Clear
            </button>

            <button
              className={`generate-btn ${isGenerating ? "generating" : ""}`}
              disabled={text.trim().length === 0 || isGenerating}
              onClick={handleGenerateSpeech}
            >
              {isGenerating ? "Synthesizing Speech..." : "Generate Speech"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
