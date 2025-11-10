import { useState, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';
import { CONNECTION_STATUS } from '../utils/constants';

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  const messageHandlerRef = useRef(null);

  const connect = useCallback(async (url, onMessage) => {
    messageHandlerRef.current = onMessage;
    setStatus(CONNECTION_STATUS.CONNECTING);

    try {
      await websocketService.connect(url, {
        onOpen: () => {
          setIsConnected(true);
          setStatus(CONNECTION_STATUS.CONNECTED);
        },
        onMessage: (event) => {
          if (messageHandlerRef.current) {
            messageHandlerRef.current(event);
          }
        },
        onError: (error) => {
          console.error('WebSocket error:', error);
          setStatus(CONNECTION_STATUS.ERROR);
        },
        onClose: () => {
          setIsConnected(false);
          setStatus(CONNECTION_STATUS.DISCONNECTED);
        }
      });
    } catch (error) {
      setIsConnected(false);
      setStatus(CONNECTION_STATUS.ERROR);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setIsConnected(false);
    setStatus(CONNECTION_STATUS.DISCONNECTED);
  }, []);

  const send = useCallback((data) => {
    return websocketService.send(data);
  }, []);

  return {
    isConnected,
    status,
    connect,
    disconnect,
    send
  };
};