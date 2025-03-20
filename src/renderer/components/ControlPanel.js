import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  startRecording,
  stopRecording,
  togglePause,
  saveRecording,
} from "../store/actions";
import "../styles/ControlPanel.css";

function ControlPanel() {
  const [url, setUrl] = useState("https://example.com");
  const { isRecording, isPaused } = useSelector((state) => state.recorder);
  const dispatch = useDispatch();

  const handleStartRecording = () => {
    dispatch(startRecording(url));
  };

  const handleStopRecording = () => {
    dispatch(stopRecording());
  };

  const handleTogglePause = () => {
    dispatch(togglePause());
  };

  const handleSaveRecording = () => {
    dispatch(saveRecording());
  };

  return (
    <div className="control-panel">
      <div className="url-input-container">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL to record"
          disabled={isRecording}
          className="url-input"
        />
      </div>

      <div className="button-container">
        {!isRecording ? (
          <button onClick={handleStartRecording} className="start-button">
            ▶️ Start Recording
          </button>
        ) : (
          <>
            <button
              onClick={handleTogglePause}
              className={isPaused ? "resume-button" : "pause-button"}
            >
              {isPaused ? "▶️ Resume" : "⏸️ Pause"}
            </button>
            <button onClick={handleStopRecording} className="stop-button">
              ⏹️ Stop
            </button>
            <button onClick={handleSaveRecording} className="save-button">
              💾 Save
            </button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="action-panel">
          <div className="current-element">
            <h4>
              Current Element:{" "}
              <span id="current-element-selector">None selected</span>
            </h4>
          </div>
          <div className="action-selector">
            <select className="action-dropdown">
              <option value="">-- Select Action --</option>
              <optgroup label="Assertions">
                <option value="assertTextContains">
                  ✓ Assert Text Contains
                </option>
                <option value="assertTextEquals">✓ Assert Text Equals</option>
                <option value="assertElementExists">
                  ✓ Assert Element Exists
                </option>
              </optgroup>
              <optgroup label="Utilities">
                <option value="captureScreenshot">📷 Take Screenshot</option>
                <option value="waitForElement">⏱️ Wait For Element</option>
              </optgroup>
            </select>
            <input type="text" className="action-value" placeholder="Value" />
            <button className="add-action-button">+ Add to Test</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ControlPanel;
