import { useState, useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  const playNextAudio = useCallback(async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);

    const blob = audioQueueRef.current.shift();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);

    const cleanup = () => {
      URL.revokeObjectURL(audioUrl);
      playNextAudio();
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;

    try {
      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      cleanup();
    }
  }, []);

  const addToQueue = useCallback((blob) => {
    audioQueueRef.current.push(blob);
    if (!isPlayingRef.current) {
      playNextAudio();
    }
  }, [playNextAudio]);

  const clearQueue = useCallback(() => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    addToQueue,
    clearQueue
  };
};