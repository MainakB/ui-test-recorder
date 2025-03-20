// src/renderer/components/BrowserView.js
import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
const { ipcRenderer } = window.require("electron");
import "../styles/BrowserView.css";

function BrowserView() {
  const webviewRef = useRef(null);
  const containerRef = useRef(null);
  const { currentUrl, isRecording, isPaused } = useSelector(
    (state) => state.recorder
  );

  const [scale, setScale] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const MARGIN_X = 20; // total horizontal margin
  const MARGIN_Y = 20; // total vertical margin

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
      const uniformScale = Math.min(
        availableWidth / 1280,
        availableHeight / 800
      );

      setScale(uniformScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, []);

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
    const handleDomReady = () => {
      console.log("Webview DOM ready");
      setIsLoading(false);

      // Inject recorder scripts
      if (isRecording && webviewRef.current) {
        injectRecorderScripts();
      }
    };

    const handleConsoleMessage = (e) => {
      console.log("Webview console:", e.message);
    };

    const handleNavigationStart = () => {
      setIsLoading(true);
      if (isRecording && !isPaused) {
        // Record navigation event
        ipcRenderer.send("page-navigated", webviewRef.current.getURL());
      }
    };

    const handleNavigationEnd = () => {
      setIsLoading(false);
    };

    const handleClick = (e) => {
      if (isRecording && !isPaused) {
        console.log("Click in webview", e);
        // We can extract element information and send it to main process
      }
    };

    if (webviewRef.current) {
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

          return () => {
            if (webviewRef.current) {
              webviewRef.current.removeEventListener(
                "dom-ready",
                handleDomReady
              );
            }
          };
        }
      };
    }
  }, [isRecording, isPaused]);

  // Listen for browser-ready events from main process
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

  const injectRecorderScripts = () => {
    if (!webviewRef.current) return;

    webviewRef.current
      .executeJavaScript(
        `
      // Create recorder object
      window.__recorder = {
        isRecording: true,
        isPaused: ${isPaused},
        
        init: function() {
          console.log('Recorder initialized');
          this.setupEventListeners();
        },
        
        setupEventListeners: function() {
          document.addEventListener('click', this.handleClick.bind(this), true);
          document.addEventListener('input', this.handleInput.bind(this), true);
          console.log('Event listeners added');
        },
        
        handleClick: function(event) {
          if (this.isPaused) return;
          
          const element = event.target;
          console.log('Click recorded on:', element.tagName, 
            element.id ? '#' + element.id : '',
            element.className ? '.' + element.className.replace(/ /g, '.') : '');
        },
        
        handleInput: function(event) {
          if (this.isPaused) return;
          
          const element = event.target;
          if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
            console.log('Input recorded on:', element.tagName, 
              element.id ? '#' + element.id : '',
              'value:', element.value);
          }
        }
      };
      
      // Initialize recorder
      window.__recorder.init();
    `
      )
      .catch((err) => {
        console.error("Failed to inject recorder scripts:", err);
      });
  };

  return (
    <div className="browser-view">
      {isLoading && <div className="loading-indicator">Loading...</div>}
      {isRecording && (
        <div className="recording-indicator">
          Recording{isPaused ? " (Paused)" : ""}...
        </div>
      )}
      <div
        className="desktop-container"
        ref={containerRef}
        style={{
          transform: `translate(${MARGIN_X / 2}px, ${
            MARGIN_Y / 2
          }px) scale(${scale})`,
        }}
      >
        <webview
          ref={webviewRef}
          src="about:blank"
          className="webview"
          preload="./preload.js"
          nodeintegration="true"
          webpreferences="contextIsolation=false"
        />
      </div>
    </div>
  );
}

export default BrowserView;
