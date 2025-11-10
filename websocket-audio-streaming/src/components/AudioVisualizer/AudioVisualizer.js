import React from 'react';

const AudioVisualizer = ({ audioLevel, isActive }) => {
  if (!isActive) return null;

  return (
    <div className="audio-visualizer">
      <div className="visualizer-header">
        <span>Audio Level</span>
        <span className="level-value">{Math.round(audioLevel)}%</span>
      </div>
      <div className="visualizer-bar">
        <div 
          className="visualizer-fill"
          style={{ width: `${audioLevel}%` }}
        />
      </div>
    </div>
  );
};

export default AudioVisualizer;