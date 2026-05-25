import { useState } from "react";
import { startAudioGeneration, startVoxCPMGeneration, checkAudioStatus } from "../api/ttsApi";

/**
 * Custom Hook: useAudioGeneration
 * 
 * Encapsulates all audio generation logic:
 * - State management (isGenerating, audioUrl, error)
 * - Async generation with polling
 * - Status checking and URL extraction
 * 
 * Usage:
 * const { isGenerating, audioUrl, error, generateSpeech, clearAudio } = useAudioGeneration();
 * 
 * @returns {Object} { isGenerating, audioUrl, error, generateSpeech, clearAudio }
 */
export const useAudioGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Extracts audio URL from response data
   * Tries multiple possible field names
   */
  const extractAudioUrl = (data) => {
    if (!data) return null;
    
    // Try common audio URL field names
    const audioUrlFields = [
      'stage4_audio_url',
      'audio_url',
      'url',
      'audioUrl',
      'audio',
      'file_url',
      'file'
    ];
    
    for (const field of audioUrlFields) {
      if (data[field]) {
        return data[field];
      }
    }
    
    // If data itself is a string, assume it's the URL
    if (typeof data === 'string') {
      return data;
    }
    
    return null;
  };

  /**
   * Handles audio generation
   * 1. Sends text to backend
   * 2. Polls for completion status
   * 3. Returns audio URL when ready
   * 
   * @param {string} text - Text to convert to speech
   * @param {string} model - Model to use (khmer-cambodia or multilingual)
   * @throws {Error} If generation fails
   */
  const generateSpeech = async (text, model) => {
    if (!text.trim()) {
      setError("Please enter text to generate speech");
      return;
    }

    setIsGenerating(true);
    setAudioUrl(null);
    setError(null);

    try {
      console.log("📝 Sending text to backend...");

      // Step 1: Generate audio — pick engine based on model selection
      // khmer-cambodia (Soriya) => VITS2,  multilingual (Sokkha) => VoxCPM
      const taskId = model === "multilingual"
        ? await startVoxCPMGeneration(text)
        : await startAudioGeneration(text);
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
          // Try to extract audio URL from various possible locations
          const audioUrlFromServer = extractAudioUrl(statusData?.data) || 
                                    extractAudioUrl(statusData);
          
          if (audioUrlFromServer) {
            console.log("✅ Audio generated successfully!");
            console.log("📁 Audio URL:", audioUrlFromServer);
            setAudioUrl(audioUrlFromServer);
            break;
          } else {
            console.warn("⚠️ Completed but no audio URL found. Response:", statusData);
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

  /**
   * Clears audio and error state
   */
  const clearAudio = () => {
    setAudioUrl(null);
    setError(null);
  };

  return {
    isGenerating,
    audioUrl,
    error,
    generateSpeech,
    clearAudio,
  };
};