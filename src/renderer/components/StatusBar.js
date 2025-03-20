import React from "react";
import { useSelector } from "react-redux";
import "../styles/StatusBar.css";

function StatusBar() {
  const { isRecording, isPaused, steps, lastSaved } = useSelector(
    (state) => state.recorder
  );

  const getStatusText = () => {
    if (isRecording) {
      return isPaused ? "Paused" : "Recording";
    }
    return "Ready";
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="status-bar">
      <div className="status-item">
        <span className="status-label">Status:</span>
        <span
          className={`status-value ${
            isRecording ? (isPaused ? "paused" : "recording") : ""
          }`}
        >
          {getStatusText()}
        </span>
      </div>
      <div className="status-item">
        <span className="status-label">Steps:</span>
        <span className="status-value">{steps.length}</span>
      </div>
      <div className="status-item">
        <span className="status-label">Last Saved:</span>
        <span className="status-value">{formatTime(lastSaved)}</span>
      </div>
    </div>
  );
}

export default StatusBar;
