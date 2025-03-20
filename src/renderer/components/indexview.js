// src/renderer/components/BrowserView.js
import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
const { ipcRenderer } = window.require("electron");
import "../styles/BrowserView.css";

function BrowserView() {
  const webviewRef = useRef(null);
  const containerRef = useRef(null);
  const { currentUrl, isRecording, isPaused, isInspecting } = useSelector(
    (state) => state.recorder
  );

  const [scale, setScale] = useState(1);
  const [customScale, setCustomScale] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMinSizeWarning, setShowMinSizeWarning] = useState(false);

  const dispatch = useDispatch();

  const MARGIN_X = 20; // total horizontal margin
  const MARGIN_Y = 20; // total vertical margin
  const MIN_SCALE = 0.3; // minimum allowed scale factor

  // Update scale factors based on container dimensions
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current || !containerRef.current.parentElement) return;

      // Get the panel's available size
      const parentRect =
        containerRef.current.parentElement.getBoundingClientRect();
      const availableWidth = parentRect.width - MARGIN_X;
      const availableHeight = parentRect.height - MARGIN_Y;

      // Uniform scale to preserve aspect ratio
      const calculatedScale = Math.min(
        availableWidth / 1280,
        availableHeight / 800
      );

      // Use custom scale if set, otherwise use calculated scale
      const newScale = customScale || calculatedScale;

      // Show warning if scale is below minimum threshold
      setShowMinSizeWarning(newScale < MIN_SCALE);

      // Apply scale, but don't go below minimum
      setScale(Math.max(newScale, MIN_SCALE));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, [customScale]);

  // When currentUrl changes, navigate the webview
  useEffect(() => {
    if (currentUrl && webviewRef.current) {
      console.log("Navigating webview to:", currentUrl);
      setIsLoading(true);
      webviewRef.current.src = currentUrl;
    }
  }, [currentUrl]);

  // Set up event handlers for the webview
  useEffect(() => {
    if (!webviewRef.current) return;

    const handleDomReady = () => {
      console.log("Webview DOM ready");
      setIsLoading(false);

      // Inject recorder scripts when recording is active
      if (isRecording && webviewRef.current) {
        injectStatusIndicator();
      }
    };

    const handleConsoleMessage = (e) => {
      console.log("Webview console:", e.message);
    };

    const handleNavigationStart = () => {
      setIsLoading(true);
    };

    const handleNavigationEnd = () => {
      setIsLoading(false);
    };

    // Handle events from the webview
    const handleWebviewMessage = (e) => {
      console.log("Received webview message:", e.channel, e.args);

      // Make sure we only process our specific messages
      if (e.channel === "webview-event") {
        const eventData = e.args[0];
        console.log("Processing webview event:", eventData.type);

        // Forward to main process
        ipcRenderer.send("webview-event", eventData);
      }
    };

    // Set up event listeners
    webviewRef.current.addEventListener("dom-ready", handleDomReady);
    webviewRef.current.addEventListener(
      "console-message",
      handleConsoleMessage
    );
    webviewRef.current.addEventListener(
      "did-start-loading",
      handleNavigationStart
    );
    webviewRef.current.addEventListener(
      "did-stop-loading",
      handleNavigationEnd
    );
    webviewRef.current.addEventListener("ipc-message", handleWebviewMessage);

    // Clean up
    return () => {
      if (webviewRef.current) {
        webviewRef.current.removeEventListener("dom-ready", handleDomReady);
        webviewRef.current.removeEventListener(
          "console-message",
          handleConsoleMessage
        );
        webviewRef.current.removeEventListener(
          "did-start-loading",
          handleNavigationStart
        );
        webviewRef.current.removeEventListener(
          "did-stop-loading",
          handleNavigationEnd
        );
        webviewRef.current.removeEventListener(
          "ipc-message",
          handleWebviewMessage
        );
      }
    };
  }, [isRecording, isPaused, isInspecting]);

  // Handle recording stopped event
  useEffect(() => {
    const handleRecordingStop = () => {
      try {
        // Just clear the webview content rather than trying to navigate
        if (webviewRef.current) {
          webviewRef.current.loadURL("about:blank");
        }
      } catch (error) {
        console.error("Error resetting webview:", error);
      }
    };

    ipcRenderer.on("recording-stopped", handleRecordingStop);

    return () => {
      ipcRenderer.removeListener("recording-stopped", handleRecordingStop);
    };
  }, []);

  const injectStatusIndicator = () => {
    if (!webviewRef.current) return;

    // Inject a floating indicator to show recording status
    webviewRef.current
      .executeJavaScript(
        `
      // Add recording indicator
      (function() {
        // Remove existing indicator if present
        const existingIndicator = document.getElementById('ui-test-recorder-indicator');
        if (existingIndicator) {
          existingIndicator.remove();
        }
        
        // Create new indicator
        const indicator = document.createElement('div');
        indicator.id = 'ui-test-recorder-indicator';
        indicator.style.position = 'fixed';
        indicator.style.zIndex = '9999999';
        indicator.style.right = '10px';
        indicator.style.top = '10px';
        indicator.style.background = 'rgba(255, 0, 0, 0.7)';
        indicator.style.color = 'white';
        indicator.style.padding = '5px 10px';
        indicator.style.borderRadius = '4px';
        indicator.style.fontSize = '12px';
        indicator.style.fontFamily = 'Arial, sans-serif';
        indicator.style.pointerEvents = 'none';
        indicator.style.transition = 'opacity 0.3s ease';
        indicator.textContent = ${
          isPaused ? "'Recording Paused'" : "'Recording Active'"
        };
        
        // Add to DOM
        document.body.appendChild(indicator);
        
        // Periodically pulse the indicator
        setInterval(() => {
          indicator.style.opacity = '0.7';
          setTimeout(() => { indicator.style.opacity = '1'; }, 500);
        }, 1000);
      })();
    `
      )
      .catch((err) => {
        console.error("Failed to inject status indicator:", err);
      });
  };

  // Zoom control handlers
  const handleZoomIn = () => {
    setCustomScale((prevScale) => {
      const newScale = prevScale ? prevScale * 1.1 : scale * 1.1;
      return Math.min(newScale, 2.0); // Limit maximum zoom
    });
  };

  const handleZoomOut = () => {
    setCustomScale((prevScale) => {
      const newScale = prevScale ? prevScale * 0.9 : scale * 0.9;
      return Math.max(newScale, MIN_SCALE); // Respect minimum zoom
    });
  };

  const handleResetZoom = () => {
    setCustomScale(null); // Reset to automatic scaling
  };

  // Format scale as percentage
  const formatZoomPercentage = () => {
    return Math.round(scale * 100) + "%";
  };

  return (
    <div className="browser-view">
      {isLoading && <div className="loading-indicator">Loading...</div>}
      {isRecording && (
        <div className="recording-indicator">
          Recording{isPaused ? " (Paused)" : ""}...
        </div>
      )}

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button onClick={handleZoomOut} title="Zoom Out">
          −
        </button>
        <div className="zoom-info">{formatZoomPercentage()}</div>
        <button onClick={handleZoomIn} title="Zoom In">
          +
        </button>
        <button onClick={handleResetZoom} title="Reset Zoom">
          ↺
        </button>
      </div>

      {/* Minimum size warning */}
      {showMinSizeWarning && (
        <div className="min-size-warning">
          Window size is too small for optimal viewing
        </div>
      )}

      <div
        className="desktop-container"
        ref={containerRef}
        style={{
          transform: `scale(${scale})`,
        }}
      >
        <webview
          ref={webviewRef}
          src="about:blank"
          className="webview"
          webpreferences="nodeIntegration=true, contextIsolation=false"
          nodeintegration="true"
          preload={`${process.cwd()}/build/preload.js`}
        />
      </div>
    </div>
  );
}

export default BrowserView;
