import React from 'react';
import { Radio, Power } from 'lucide-react';

const ConnectionPanel = ({ 
  serverUrl, 
  setServerUrl, 
  isConnected, 
  status,
  onConnect, 
  onDisconnect 
}) => {
  return (
    <div className="connection-panel">
      <div className="status-indicator">
        <span className="status-label">Status:</span>
        <div className="status-value">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{status}</span>
        </div>
      </div>

      <div className="input-group">
        <label>WebSocket Server URL</label>
        <input
          type="text"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          disabled={isConnected}
          placeholder="ws://localhost:8080"
        />
      </div>

      <div className="button-group">
        <button
          onClick={onConnect}
          disabled={isConnected}
          className="btn btn-success"
        >
          <Radio size={20} />
          Connect
        </button>
        <button
          onClick={onDisconnect}
          disabled={!isConnected}
          className="btn btn-danger"
        >
          <Power size={20} />
          Disconnect
        </button>
      </div>
    </div>
  );
};

export default ConnectionPanel;