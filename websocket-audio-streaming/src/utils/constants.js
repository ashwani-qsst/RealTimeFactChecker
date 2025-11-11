export const DEFAULT_WS_URL = 'ws://localhost:8000/ws/audio';

export const RECORDING_CONFIG = {
 mimeType: 'audio/webm;codecs=opus', // ✅ full WebM header each time
  audioBitsPerSecond: 128000
};

export const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

export const CONNECTION_STATUS = {
  DISCONNECTED: 'Disconnected',
  CONNECTING: 'Connecting...',
  CONNECTED: 'Connected',
  ERROR: 'Connection Error',
  RECORDING: 'Recording & Streaming',
  PLAYING: 'Playing Audio'
};