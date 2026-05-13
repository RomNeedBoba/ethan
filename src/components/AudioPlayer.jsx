import React, { useState, useRef, useEffect } from 'react';
import './AudioPlayer.css';

/**
 * AudioPlayer Component - Secure Audio Playback
 * Handles audio playback with validation, error handling, and accessibility
 * 
 * Features:
 * - Play/Pause controls
 * - Progress seeking
 * - Volume control
 * - Playback speed (0.75x, 1x, 1.25x, 1.5x)
 * - Download functionality
 * - XSS prevention & URL validation
 * - Full ARIA labels for accessibility
 */
const AudioPlayer = ({ audioUrl }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [error, setError] = useState(null);

  /**
   * Validates audio URL to prevent XSS attacks
   * Only allows http, https, and blob URLs
   */
  const validateAudioUrl = (url) => {
    if (!url) return null;
    
    const allowedProtocols = ['http://', 'https://', 'blob:'];
    const isValid = allowedProtocols.some(protocol => url.startsWith(protocol));
    
    if (!isValid) {
      throw new Error('Invalid audio URL');
    }
    
    return url;
  };

  useEffect(() => {
    try {
      const validUrl = validateAudioUrl(audioUrl);
      if (validUrl && audioRef.current) {
        audioRef.current.src = validUrl;
        audioRef.current.play().catch(e => console.log('Autoplay prevented:', e));
        setIsPlaying(true);
        setError(null);
      }
    } catch (err) {
      setError(err.message);
      setIsPlaying(false);
    }
  }, [audioUrl]);

  const togglePlayPause = () => {
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      setError('Error controlling playback');
    }
  };

  const handleTimeUpdate = () => setCurrentTime(audioRef.current.currentTime);
  const handleLoadedMetadata = () => setDuration(audioRef.current.duration);

  const handleSeek = (e) => {
    try {
      const bar = e.currentTarget;
      const ratio = e.nativeEvent.offsetX / bar.offsetWidth;
      audioRef.current.currentTime = ratio * (audioRef.current.duration || 0);
    } catch (err) {
      console.error('Seek error:', err);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    audioRef.current.volume = vol;
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    audioRef.current.playbackRate = speed;
  };

  const handleAudioError = () => {
    setError('Error loading audio file');
    setIsPlaying(false);
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const downloadAudio = () => {
    try {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = 'generated_speech.wav';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setError('Download failed');
    }
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="ap error-state" role="alert">
        <p>❌ {error}</p>
      </div>
    );
  }

  return (
    <div className="ap" role="region" aria-label="Audio player">

      {/* Header: Label + Download Button */}
      <div className="ap-top">
        <span className="ap-label">Generated Speech</span>
        <button 
          className="ap-dl" 
          onClick={downloadAudio} 
          title="Download audio"
          aria-label="Download audio file"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Seek Bar */}
      <div className="ap-seek-row">
        <span className="ap-time" aria-label="Current time">{formatTime(currentTime)}</span>
        <div 
          className="ap-bar-track" 
          onClick={handleSeek}
          role="slider"
          aria-label="Audio progress"
          aria-valuemin="0"
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
        >
          <div className="ap-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="ap-time" aria-label="Total duration">{formatTime(duration)}</span>
      </div>

      {/* Controls: Volume | Play/Pause | Speed */}
      <div className="ap-btm">
        {/* Volume Control */}
        <div className="ap-vol-wrap">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" />
          </svg>
          <input
            className="ap-vol-input"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
        </div>

        {/* Play/Pause Button */}
        <button
          className="ap-play"
          onClick={togglePlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <rect x="4" y="3" width="4" height="14" rx="1" />
              <rect x="12" y="3" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        {/* Playback Speed Buttons */}
        <div className="ap-speeds" role="group" aria-label="Playback speed">
          {[0.75, 1, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              className={`ap-spd${playbackSpeed === speed ? ' on' : ''}`}
              onClick={() => handleSpeedChange(speed)}
              aria-pressed={playbackSpeed === speed}
              title={`${speed}x speed`}
            >
              {speed}×
            </button>
          ))}
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={handleAudioError}
      />
    </div>
  );
};

export default AudioPlayer;
