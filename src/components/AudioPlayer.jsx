import React, { useState, useRef, useEffect } from 'react';
import './AudioPlayer.css';

const AudioPlayer = ({ audioUrl }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Autoplay prevented:", e));
      setIsPlaying(true);
    }
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    const seekTime = Number(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
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

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const downloadAudio = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'generated_speech.wav';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="audio-player-container">
      <div className="audio-header">
        <div className="audio-title-section">
          <div className="audio-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M18 3a1 1 0 00-1.196-.15l-1 .667-1-2.667A1 1 0 0013 1H7a1 1 0 00-.804 1.85l-1 2.667-1-.667A1 1 0 004 3v14a2 2 0 002 2h8a2 2 0 002-2V3z" />
            </svg>
          </div>
          <div>
            <h3 className="audio-title">Generated Speech</h3>
            <p className="audio-duration">{formatTime(duration)}</p>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Main Player Controls */}
      <div className="audio-player">
        <button 
          className="play-pause-btn" 
          onClick={togglePlayPause} 
          title={isPlaying ? 'Pause' : 'Play'}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 20 20" fill="currentColor">
              <rect x="5" y="3" width="3" height="14" />
              <rect x="12" y="3" width="3" height="14" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        {/* Progress Bar */}
        <div className="progress-section">
          <span className="time-display">{formatTime(currentTime)}</span>
          
          <div className="progress-bar-wrapper">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              className="progress-slider"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Progress"
            />
          </div>

          <span className="time-display">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Secondary Controls */}
      <div className="audio-controls">
        <div className="volume-control">
          <svg className="control-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 4a1 1 0 01.894.553l2.991 5.982a1 1 0 11-1.788.894L8.105 5.553A1 1 0 019 4zM3 1a1 1 0 000 2h12a1 1 0 100-2H3z" />
          </svg>
          <input
            type="range"
            className="volume-slider"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
        </div>

        <div className="speed-controls">
          {[0.75, 1, 1.25, 1.5].map(speed => (
            <button
              key={speed}
              className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
              onClick={() => handleSpeedChange(speed)}
              aria-pressed={playbackSpeed === speed}
            >
              {speed}x
            </button>
          ))}
        </div>

        <button 
          className="download-btn" 
          onClick={downloadAudio} 
          title="Download Audio"
          aria-label="Download Audio"
        >
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AudioPlayer;