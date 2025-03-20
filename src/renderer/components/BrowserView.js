// src/renderer/components/BrowserView.js
import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
const { ipcRenderer } = window.require("electron");
import "../styles/BrowserView.css";

function BrowserView() {
  const webviewRef = useRef(null);
  const { currentUrl, isRecording } = useSelector((state) => state.recorder);

  // When currentUrl changes, navigate the webview
  useEffect(() => {
    if (currentUrl && webviewRef.current) {
      console.log("Navigating webview to:", currentUrl);
      // Make sure the webview is loaded before setting src
      if (webviewRef.current.readyState === "complete") {
        webviewRef.current.src = currentUrl;
      } else {
        webviewRef.current.addEventListener(
          "dom-ready",
          () => {
            webviewRef.current.src = currentUrl;
          },
          { once: true }
        );
      }
    }
  }, [currentUrl]);

  // Listen for browser-ready events
  useEffect(() => {
    const handleBrowserReady = (event, data) => {
      console.log("Browser ready with URL:", data.url);
      if (webviewRef.current && data.url) {
        webviewRef.current.src = data.url;
      }
    };

    ipcRenderer.on("browser-ready", handleBrowserReady);

    return () => {
      ipcRenderer.removeListener("browser-ready", handleBrowserReady);
    };
  }, []);

  // Handle recording stopped event
  useEffect(() => {
    const handleRecordingStop = () => {
      if (webviewRef.current) {
        try {
          webviewRef.current.src = "";
        } catch (error) {
          console.error("Error resetting webview:", error);
        }
      }
    };

    ipcRenderer.on("recording-stopped", handleRecordingStop);

    return () => {
      ipcRenderer.removeListener("recording-stopped", handleRecordingStop);
    };
  }, []);

  return (
    <div className="browser-view">
      <webview
        ref={webviewRef}
        src=""
        className="webview"
        nodeintegration="true"
        webpreferences="contextIsolation=false"
        partition="persist:uitestrecorder"
      />
    </div>
  );
}

export default BrowserView;
