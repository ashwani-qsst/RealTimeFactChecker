class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  connect(url, callbacks = {}) {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          if (callbacks.onOpen) callbacks.onOpen();
          resolve(this.ws);
        };

        this.ws.onmessage = (event) => {
          if (callbacks.onMessage) callbacks.onMessage(event);
        };

        this.ws.onerror = (error) => {
          if (callbacks.onError) callbacks.onError(error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          if (callbacks.onClose) callbacks.onClose(event);
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              if (callbacks.onReconnect) callbacks.onReconnect(this.reconnectAttempts);
              this.connect(url, callbacks);
            }, this.reconnectDelay);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
      return true;
    }
    return false;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketService();