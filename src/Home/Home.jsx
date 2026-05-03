import React, { useState } from "react";
import CustomSelect from "../components/CustomSelect";
import AudioPlayer from "../components/AudioPlayer"; // <-- IMPORTING YOUR NEW PLAYER
import { startAudioGeneration, checkAudioStatus } from "../api/ttsApi";
import "./Home.css";

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

  // PREMIUM UX: Add 'disabled: true' to models that aren't ready yet!
  const modelOptions = [
    { value: "khmer-cambodia", label: "Soriya" },
    { value: "multilingual", label: "Sokkha", disabled: true },
  ];

  // You can do the same for voices if you want!
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
      
      let isDone = false;
      while (!isDone) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        const statusData = await checkAudioStatus(taskId);

        if (statusData.status === "completed") {
          isDone = true;
          const finalAudioUrl = statusData.data.stage4_audio_url; 
          
          setAudioUrl(finalAudioUrl);
          
        } else if (statusData.status === "failed") {
          isDone = true;
          alert("Failed to generate audio. Please try again.");
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
            <CustomSelect id="model-select" value={model} options={modelOptions} onChange={setModel} />
          </div>
          
          <div className="home-control-group">
            <label htmlFor="voice-select">Voice</label>
            <CustomSelect id="voice-select" value={voice} options={voiceOptions} onChange={setVoice} />
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

        {/* --- PREMIUM AUDIO PLAYER --- */}
        {audioUrl && (
          <AudioPlayer audioUrl={audioUrl} />
        )}

        <div className="home-actions">
          <div className="actions-left"></div>
          
          <div className="actions-right">
            <button className="icon-btn reset-btn" onClick={handleClearText} disabled={isGenerating} title="Clear text">
              <svg className="refresh-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2v6h-6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 22v-6h6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <button 
              className={`generate-btn ${isGenerating ? 'generating' : ''}`}
              disabled={text.trim().length === 0 || isGenerating}
              onClick={handleGenerateSpeech}
            >
              {isGenerating ? (
                <>
                  <svg className="spinner-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite", marginRight: "8px" }}>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                  </svg>
                  Synthesizing Speech...
                </>
              ) : (
                "Generate Speech"
              )}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}