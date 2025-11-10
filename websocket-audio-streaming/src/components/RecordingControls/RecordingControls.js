import React from 'react';
import { Mic, MicOff } from 'lucide-react';

const RecordingControls = ({ 
  isRecording, 
  isConnected,
  onStartRecording, 
  onStopRecording 
}) => {
  return (
    <div className="recording-controls">
      <button
        onClick={onStartRecording}
        disabled={!isConnected || isRecording}
        className="btn btn-primary btn-large"
      >
        <Mic size={24} />
        Start Recording
      </button>
      <button
        onClick={onStopRecording}
        disabled={!isRecording}
        className="btn btn-warning btn-large"
      >
        <MicOff size={24} />
        Stop Recording
      </button>
    </div>
  );
};

export default RecordingControls;