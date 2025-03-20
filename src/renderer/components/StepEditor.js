import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import "../styles/BrowserView.css";

function BrowserView() {
  const webviewRef = useRef(null);
  const { currentUrl, isRecording } = useSelector((state) => state.recorder);

  useEffect(() => {
    if (currentUrl && webviewRef.current) {
      webviewRef.current.src = currentUrl;
    }
  }, [currentUrl]);

  // Handle recording initialization when webview is ready
  useEffect(() => {
    const handleWebviewReady = () => {
      if (webviewRef.current && isRecording) {
        // Inject recorder scripts into webview
        webviewRef.current.executeJavaScript(`
          console.log('Recording initialized in browser');
          // Recorder initialization will go here
        `);
      }
    };

    if (webviewRef.current) {
      webviewRef.current.addEventListener("dom-ready", handleWebviewReady);
    }

    return () => {
      if (webviewRef.current) {
        webviewRef.current.removeEventListener("dom-ready", handleWebviewReady);
      }
    };
  }, [isRecording]);

  return (
    <div className="browser-view">
      <webview
        ref={webviewRef}
        src="about:blank"
        className="webview"
        webpreferences="contextIsolation=false"
      />
    </div>
  );
}

export default BrowserView;
