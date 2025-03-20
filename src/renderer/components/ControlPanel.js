import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  startRecording,
  stopRecording,
  togglePause,
  saveRecording,
  loadRecording,
  inspectElement,
  addAssertion,
} from "../store/actions";
import "../styles/ControlPanel.css";

function ControlPanel() {
  const [url, setUrl] = useState("https://example.com");
  const [assertionType, setAssertionType] = useState("");
  const [assertionValue, setAssertionValue] = useState("");
  const { isRecording, isPaused, selectedElement, isInspecting } = useSelector(
    (state) => state.recorder
  );
  const dispatch = useDispatch();

  // Reset assertion inputs when selected element changes
  useEffect(() => {
    if (selectedElement) {
      setAssertionType("assertTextContains");
      setAssertionValue(selectedElement.textContent || "");
    }
  }, [selectedElement]);

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

  const handleLoadRecording = () => {
    dispatch(loadRecording());
  };

  const handleInspectElement = () => {
    dispatch(inspectElement());
  };

  const handleAddAssertion = () => {
    if (selectedElement && assertionType && assertionValue) {
      dispatch(
        addAssertion(assertionType, selectedElement.selector, assertionValue)
      );

      // Reset after adding
      setAssertionValue("");
    }
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
          <>
            <button onClick={handleStartRecording} className="start-button">
              ▶️ Start Recording
            </button>
            <button onClick={handleLoadRecording} className="load-button">
              📂 Load
            </button>
          </>
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
            <button
              onClick={handleInspectElement}
              className={`inspect-button ${isInspecting ? "active" : ""}`}
              disabled={isPaused && !isInspecting}
            >
              🔍 Inspect Element
            </button>
          </>
        )}
      </div>

      {isRecording && (
        <div className="action-panel">
          <div className="current-element">
            <h4>Selected Element: </h4>
            <div className="element-info">
              {selectedElement ? (
                <>
                  <span className="element-selector">
                    {selectedElement.selector?.[0]?.value || "Unknown"}
                  </span>
                  <span className="element-type">
                    {selectedElement.tagName || "Element"}
                  </span>
                </>
              ) : (
                <span className="no-element">
                  None selected (use Inspect to select)
                </span>
              )}
            </div>
          </div>

          {selectedElement && (
            <div className="assertion-creator">
              <div className="assertion-type">
                <select
                  value={assertionType}
                  onChange={(e) => setAssertionType(e.target.value)}
                  className="assertion-dropdown"
                >
                  <option value="">-- Select Assertion Type --</option>
                  <optgroup label="Text Assertions">
                    <option value="assertTextContains">✓ Text Contains</option>
                    <option value="assertTextEquals">✓ Text Equals</option>
                    <option value="assertTextMatches">
                      ✓ Text Matches Regex
                    </option>
                  </optgroup>
                  <optgroup label="Element Assertions">
                    <option value="assertElementExists">
                      ✓ Element Exists
                    </option>
                    <option value="assertElementVisible">
                      ✓ Element Visible
                    </option>
                    <option value="assertElementEnabled">
                      ✓ Element Enabled
                    </option>
                  </optgroup>
                  <optgroup label="Attribute Assertions">
                    <option value="assertAttributeValue">
                      ✓ Attribute Value
                    </option>
                    <option value="assertCssProperty">✓ CSS Property</option>
                  </optgroup>
                </select>
              </div>

              <div className="assertion-value">
                <input
                  type="text"
                  value={assertionValue}
                  onChange={(e) => setAssertionValue(e.target.value)}
                  placeholder="Value to assert"
                  className="assertion-value-input"
                />
              </div>

              <button
                onClick={handleAddAssertion}
                disabled={!selectedElement || !assertionType || !assertionValue}
                className="add-assertion-button"
              >
                + Add Assertion
              </button>
            </div>
          )}

          <div className="utility-actions">
            <select className="utility-dropdown">
              <option value="">-- Utility Actions --</option>
              <optgroup label="Wait Actions">
                <option value="waitForElement">⏱️ Wait For Element</option>
                <option value="waitForNavigation">
                  ⏱️ Wait For Navigation
                </option>
                <option value="waitForTimeout">⏱️ Wait Timeout (ms)</option>
              </optgroup>
              <optgroup label="Network Actions">
                <option value="waitForRequest">🌐 Wait For Request</option>
                <option value="waitForResponse">🌐 Wait For Response</option>
              </optgroup>
              <optgroup label="Capture Actions">
                <option value="takeScreenshot">📷 Take Screenshot</option>
                <option value="captureNetworkRequests">
                  📡 Capture Network Traffic
                </option>
              </optgroup>
            </select>
            <button className="add-utility-button">+ Add Utility</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ControlPanel;
