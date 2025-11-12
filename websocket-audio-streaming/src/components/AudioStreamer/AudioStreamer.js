import React, { useState, useEffect, useCallback } from 'react';
import { RadioTower, Play, AlertCircle } from 'lucide-react';
import ConnectionPanel from '../ConnectionPanel';
import AudioVisualizer from '../AudioVisualizer';
import RecordingControls from '../RecordingControls';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { DEFAULT_WS_URL } from '../../utils/constants';
import './AudioStreamer.css';

const AudioStreamer = () => {
  const [serverUrl, setServerUrl] = useState(DEFAULT_WS_URL);
  const [captions, setCaptions] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);

  const { isConnected, status, connect, disconnect, send } = useWebSocket();
  const { isPlaying, addToQueue, clearQueue } = useAudioPlayer();

  // Handle each chunk of audio recorded
  const handleDataAvailable = useCallback((data) => {
    if (data && isConnected) {
      send(data);
    }
  }, [isConnected, send]);

  // Recorder hook
  const {
    isRecording,
    audioLevel,
    error: recordingError,
    startRecording,
    stopRecording,
  } = useAudioRecorder(handleDataAvailable);

  // Handle backend WebSocket messages
  const handleMessage = useCallback((event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === "caption_update") {
        console.log("🆕 Caption:", msg.text);
        setCaptions((prev) => prev + " " + msg.text);
      } else if (msg.error) {
        console.error("⚠️ Backend error:", msg.error);
        setErrorMessage(msg.error);
      } else if (event.data instanceof Blob) {
        // Optional: playback echo audio from backend (if server sends it)
        addToQueue(event.data);
      }
    } catch (err) {
      console.warn("⚠️ Non-JSON message:", event.data);
    }
  }, [addToQueue]);

  // Connect button click
  const handleConnect = async () => {
    try {
      await connect(serverUrl, handleMessage);
      console.log("✅ Connected to WebSocket:", serverUrl);
    } catch (error) {
      console.error("Connection failed:", error);
      setErrorMessage("Failed to connect to server.");
    }
  };

  // Disconnect cleanup
  const handleDisconnect = useCallback(() => {
    stopRecording();
    clearQueue();
    disconnect();
    setCaptions("");
  }, [stopRecording, clearQueue, disconnect]);

  // Ensure clean unmount
  useEffect(() => {
    return () => {
      handleDisconnect();
    };
  }, [handleDisconnect]);

  return (
    <div className="audio-streamer-container">
      <div className="audio-streamer-card">
        <div className="header">
          <RadioTower className="header-icon" size={48} />
          <h1>Live Speech Transcription</h1>
          <p>Stream audio to server and get real-time captions</p>
        </div>

        <ConnectionPanel
          serverUrl={serverUrl}
          setServerUrl={setServerUrl}
          isConnected={isConnected}
          status={status}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />

        {isPlaying && (
          <div className="playback-indicator">
            <Play size={16} />
            <span>Playing echo audio...</span>
          </div>
        )}

        {recordingError && (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>{recordingError}</span>
          </div>
        )}

        {errorMessage && (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <AudioVisualizer audioLevel={audioLevel} isActive={isRecording} />

        <RecordingControls
          isRecording={isRecording}
          isConnected={isConnected}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />

        {/* 💬 Live Captions */}
        <div className="caption-box">
          {/* <MessageSquareText size={18} style={{ marginRight: "6px" }} /> */}
          <strong>Live Captions:</strong>
          <div className="caption-text">
            {captions || "🎙️ Speak something..."}
          </div>
        </div>

        <div className="info-box">
          <p>
            <strong>Note:</strong> Audio is streamed via WebSocket. The backend uses
            Whisper to transcribe your speech in real time and sends captions back.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AudioStreamer;
