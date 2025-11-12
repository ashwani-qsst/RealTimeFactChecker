import React, { useState, useEffect, useCallback, useRef } from "react";
import { RadioTower, Play, AlertCircle, Type } from "lucide-react";
import ConnectionPanel from "../ConnectionPanel";
import AudioVisualizer from "../AudioVisualizer";
import RecordingControls from "../RecordingControls";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useAudioRecorder } from "../../hooks/useAudioRecorder";
import { useAudioPlayer } from "../../hooks/useAudioPlayer";
import { DEFAULT_WS_URL } from "../../utils/constants";
import "./AudioStreamer.css";

const AudioStreamer = () => {
  const [serverUrl, setServerUrl] = useState(DEFAULT_WS_URL);
  const [captions, setCaptions] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isCaptioning, setIsCaptioning] = useState(false);

  const captionRef = useRef(null);

  const { isConnected, status, connect, disconnect, send } = useWebSocket();
  const { isPlaying, addToQueue, clearQueue } = useAudioPlayer();

  // Smoothly auto-scroll captions as they grow
  useEffect(() => {
    if (captionRef.current) {
      captionRef.current.scrollTop = captionRef.current.scrollHeight;
    }
  }, [captions]);

  // Handle audio chunks being recorded
  const handleDataAvailable = useCallback(
    (data) => {
      if (data && isConnected) {
        send(data);
      }
    },
    [isConnected, send]
  );

  // Audio Recorder
  const {
    isRecording,
    audioLevel,
    error: recordingError,
    startRecording,
    stopRecording,
  } = useAudioRecorder(handleDataAvailable);

  // Handle WebSocket messages (captions or errors)
  const handleMessage = useCallback(
    (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "caption_update") {
          const newCaption = msg.text.trim();
          console.log("🆕 Caption:", newCaption);
          setCaptions((prev) => [...prev, newCaption]);
          setIsCaptioning(true);
        } else if (msg.error) {
          console.error("⚠️ Backend error:", msg.error);
          setErrorMessage(msg.error);
        } else if (event.data instanceof Blob) {
          // Optional: echo audio from backend
          addToQueue(event.data);
        }
      } catch (err) {
        console.warn("⚠️ Non-JSON message:", event.data);
      }
    },
    [addToQueue]
  );

  // Connect
  const handleConnect = async () => {
    try {
      await connect(serverUrl, handleMessage);
      console.log("✅ Connected to WebSocket:", serverUrl);
      setErrorMessage(null);
    } catch (error) {
      console.error("Connection failed:", error);
      setErrorMessage("Failed to connect to server.");
    }
  };

  // Disconnect
  const handleDisconnect = useCallback(() => {
    stopRecording();
    clearQueue();
    disconnect();
    setCaptions([]);
    setIsCaptioning(false);
  }, [stopRecording, clearQueue, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => handleDisconnect();
  }, [handleDisconnect]);

  return (
    <div className="audio-streamer-container">
      <div className="audio-streamer-card">
        <div className="header">
          <RadioTower className="header-icon" size={48} />
          <h1>Live Speech Transcription</h1>
          <p>Stream your mic to the backend and see captions appear instantly</p>
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
            <span>Playing back audio...</span>
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
          <div className="caption-header">
            <Type size={18} style={{ marginRight: "6px" }} />
            <strong>Live Captions</strong>
          </div>
          <div className="caption-text" ref={captionRef}>
            {captions.length > 0 ? (
              captions.map((line, i) => (
                <p key={i} className="caption-line">
                  {line}
                </p>
              ))
            ) : (
              <p className="placeholder">
                {isConnected
                  ? "🎙️ Waiting for speech..."
                  : "🔌 Connect to start transcription."}
              </p>
            )}
          </div>
        </div>

        <div className="info-box">
          <p>
            <strong>Note:</strong> Audio is streamed via WebSocket to your FastAPI
            backend, transcribed with Whisper, and captions update live here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AudioStreamer;
