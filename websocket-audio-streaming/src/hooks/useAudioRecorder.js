import { useState, useRef, useCallback } from 'react';
import { RECORDING_CONFIG, AUDIO_CONSTRAINTS } from '../utils/constants';
import { 
  getMicrophoneStream, 
  createAudioAnalyser, 
  stopMediaStream, 
  getAudioLevel 
} from '../utils/audioUtils';

export const useAudioRecorder = (onDataAvailable) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  const visualize = useCallback(() => {
    if (!analyserRef.current) return;

    const updateLevel = () => {
      const level = getAudioLevel(analyserRef.current);
      setAudioLevel(level);

      if (mediaRecorderRef.current?.state === 'recording') {
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    const { stream, error } = await getMicrophoneStream(AUDIO_CONSTRAINTS);
    
    if (error) {
      setError(error);
      return false;
    }

    streamRef.current = stream;

    const { audioContext, analyser } = createAudioAnalyser(stream);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    visualize();

    const mediaRecorder = new MediaRecorder(stream, RECORDING_CONFIG);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && onDataAvailable) {
        onDataAvailable(event.data);
      }
    };

    mediaRecorder.start(RECORDING_CONFIG.timeslice);
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);

    return true;
  }, [onDataAvailable, visualize]);

  const stopRecording = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    stopMediaStream(streamRef.current);

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    mediaRecorderRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;

    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  return {
    isRecording,
    audioLevel,
    error,
    startRecording,
    stopRecording
  };
};