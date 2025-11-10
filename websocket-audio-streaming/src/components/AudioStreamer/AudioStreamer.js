import React, { useState, useEffect } from 'react';
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
  
  const { isConnected, status, connect, disconnect, send } = useWebSocket();
  const { isPlaying, addToQueue, clearQueue } = useAudioPlayer();
  
  const handleDataAvailable = (data) => {
    send(data);
  };
  
  const { 
    isRecording, 
    audioLevel, 
    error: recordingError,
    startRecording, 
    stopRecording 
  } = useAudioRecorder(handleDataAvailable);

  const handleConnect = async () => {
    try {
      await connect(serverUrl, (event) => {
        if (event.data instanceof Blob) {
          addToQueue(event.data);
        }
      });
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    stopRecording();
    clearQueue();
    disconnect();
  };

  useEffect(() => {
    return () => {
      handleDisconnect();
    };
  }, []);

  return (
    <div className="audio-streamer-container">
      <div className="audio-streamer-card">
        <div className="header">
          <RadioTower className="header-icon" size={48} />
          <h1>WebSocket Audio Streaming</h1>
          <p>Real-time audio transmission over WebSocket</p>
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
            <span>Playing incoming audio...</span>
          </div>
        )}

        {recordingError && (
          <div className="error-message">
            <AlertCircle size={16} />
            <span>{recordingError}</span>
          </div>
        )}

        <AudioVisualizer 
          audioLevel={audioLevel} 
          isActive={isRecording} 
        />

        <RecordingControls
          isRecording={isRecording}
          isConnected={isConnected}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />

        <div className="info-box">
          <p>
            <strong>Note:</strong> This requires a WebSocket server that can receive 
            and optionally echo back audio data. Connect to your server and start 
            recording to stream audio in real-time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AudioStreamer;