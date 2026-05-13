import React, { useState } from "react";
import CustomSelect from "../components/CustomSelect";
import AudioPlayer from "../components/AudioPlayer";
import { startAudioGeneration, checkAudioStatus } from "../api/ttsApi";
import "./Home.css";

/**
 * Home Component - Main TTS Interface
 * Handles text input, model/voice selection, and audio generation
 */
export default function Home() {
  const [text, setText] = useState("");
  const [model, setModel] = useState("khmer-cambodia");
  const [voice, setVoice] = useState("the-documentarian");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const maxLength = 5000;

  const handleClearText = () => {
    setText("");
    setAudioUrl(null);
    setError(null);
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

  /**
   * Handles audio generation
   * 1. Sends text to backend
   * 2. Polls for completion status
   * 3. Returns audio URL when ready
   */
  const handleGenerateSpeech = async () => {
    if (!text.trim()) {
      setError("Please enter text to generate speech");
      return;
    }

    setIsGenerating(true);
    setAudioUrl(null);
    setError(null);

    try {
      console.log("📝 Sending text to backend...");
      
      // Step 1: Generate audio
      const taskId = await startAudioGeneration(text);
      console.log("✅ Task ID received:", taskId);

      // Step 2: Poll for completion (5s intervals, max 60 attempts = 5 minutes)
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        console.log(`🔄 Status check attempt ${attempts}/${maxAttempts}...`);
        const statusData = await checkAudioStatus(taskId);

        if (statusData.status === "completed") {
          const audioUrlFromServer = statusData?.data?.stage4_audio_url;
          
          if (audioUrlFromServer) {
            console.log("✅ Audio generated successfully!");
            setAudioUrl(audioUrlFromServer);
            break;
          } else {
            throw new Error("No audio URL received from server");
          }
        }

        if (statusData.status === "failed") {
          throw new Error("Audio generation failed on backend");
        }

        // Status is still "processing", continue polling
      }

      if (attempts >= maxAttempts) {
        throw new Error("Audio generation timed out (5+ minutes)");
      }
    } catch (err) {
      console.error("❌ Audio generation error:", err.message);
      setError(err.message || "Failed to generate audio. Please try again.");
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

        {/* Text Input Section */}
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
              aria-label="Text input for speech synthesis"
            />
            <div className="char-counter" aria-live="polite">
              {text.length} / {maxLength}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message" role="alert">
            ❌ {error}
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
            title="Clear text and audio"
            aria-label="Clear text"
          >
            Clear
          </button>

          <button
            className={`generate-btn ${isGenerating ? "generating" : ""}`}
            disabled={text.trim().length === 0 || isGenerating}
            onClick={handleGenerateSpeech}
            aria-label={isGenerating ? "Generating speech" : "Generate speech"}
          >
            {isGenerating ? "Synthesizing Speech..." : "Generate Speech"}
          </button>
        </div>
      </div>
    </main>
  );
}
