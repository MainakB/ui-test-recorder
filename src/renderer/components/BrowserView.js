import React, { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { ipcRenderer } from "electron";
import { setSelectedElement } from "../store/actions";
import "../styles/BrowserView.css";

function BrowserView() {
  const webviewRef = useRef(null);
  const { currentUrl, isRecording, isPaused, isInspecting } = useSelector(
    (state) => state.recorder
  );
  const dispatch = useDispatch();

  useEffect(() => {
    if (currentUrl) {
      // Connect to browser via IPC
      ipcRenderer.on("browser-ready", (event, data) => {
        if (webviewRef.current) {
          webviewRef.current.src = currentUrl;
          // You can also set up a connection to the browser's WebSocket endpoint
          // if needed for more advanced communication
        }
      });
    }

    return () => {
      ipcRenderer.removeAllListeners("browser-ready");
    };
  }, [currentUrl]);

  // Handle recording initialization when webview is ready
  useEffect(() => {
    const handleWebviewReady = () => {
      if (webviewRef.current && isRecording) {
        // Initialize message channel between renderer and webview
        webviewRef.current.addEventListener("ipc-message", handleIpcMessage);

        // Inject recorder scripts
        injectRecorderScripts();
      }
    };

    const handleIpcMessage = (event) => {
      if (event.channel === "element-clicked") {
        dispatch(setSelectedElement(event.args[0]));
      } else if (event.channel === "element-selected") {
        dispatch(setSelectedElement(event.args[0]));
      }
    };

    if (webviewRef.current) {
      webviewRef.current.addEventListener("dom-ready", handleWebviewReady);
    }

    return () => {
      if (webviewRef.current) {
        webviewRef.current.removeEventListener("dom-ready", handleWebviewReady);
        webviewRef.current.removeEventListener("ipc-message", handleIpcMessage);
      }
    };
  }, [isRecording, dispatch]);

  // Toggle inspection mode
  useEffect(() => {
    if (webviewRef.current && webviewRef.current.getWebContents) {
      if (isInspecting) {
        // Initialize element inspector
        webviewRef.current.executeJavaScript(`
          // Inject inspector tool
          if (!window.__inspector) {
            window.__inspector = {
              enabled: true,
              highlightElement: function(element) {
                // Remove previous highlight
                const prev = document.getElementById('__recorder_highlight');
                if (prev) prev.remove();
                
                // Create highlight element
                const highlight = document.createElement('div');
                highlight.id = '__recorder_highlight';
                highlight.style.position = 'absolute';
                highlight.style.border = '2px solid red';
                highlight.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
                highlight.style.pointerEvents = 'none';
                highlight.style.zIndex = '10000';
                
                // Get element position
                const rect = element.getBoundingClientRect();
                highlight.style.top = rect.top + 'px';
                highlight.style.left = rect.left + 'px';
                highlight.style.width = rect.width + 'px';
                highlight.style.height = rect.height + 'px';
                
                document.body.appendChild(highlight);
              },
              
              selectElement: function(element) {
                // Get element info
                const elementInfo = {
                  tagName: element.tagName,
                  id: element.id,
                  className: element.className,
                  textContent: element.textContent.trim().substring(0, 100),
                  value: element.value,
                  attributes: Array.from(element.attributes).map(attr => ({
                    name: attr.name,
                    value: attr.value
                  })),
                  selector: this.generateSelector(element)
                };
                
                // Send to main
                window.postMessage({
                  channel: 'element-selected',
                  data: elementInfo,
                  source: 'inspector'
                }, '*');
                
                // Disable inspector
                this.enabled = false;
              },
              
              generateSelector: function(element) {
                // Simple selector generation
                if (element.id) {
                  return '#' + element.id;
                }
                if (element.className) {
                  const classes = element.className.split(' ').filter(Boolean);
                  if (classes.length) {
                    return '.' + classes[0];
                  }
                }
                return element.tagName.toLowerCase();
              }
            };
            
            // Set up event listeners
            document.addEventListener('mouseover', function(e) {
              if (window.__inspector && window.__inspector.enabled) {
                window.__inspector.highlightElement(e.target);
              }
            });
            
            document.addEventListener('click', function(e) {
              if (window.__inspector && window.__inspector.enabled) {
                e.preventDefault();
                e.stopPropagation();
                window.__inspector.selectElement(e.target);
              }
            }, true);
          } else {
            window.__inspector.enabled = true;
          }
        `);
      } else {
        // Disable inspector
        webviewRef.current.executeJavaScript(`
          if (window.__inspector) {
            window.__inspector.enabled = false;
            // Remove highlight
            const highlight = document.getElementById('__recorder_highlight');
            if (highlight) highlight.remove();
          }
        `);
      }
    }
  }, [isInspecting]);

  const injectRecorderScripts = () => {
    if (!webviewRef.current) return;

    webviewRef.current.executeJavaScript(`
      // Initialize recorder
      window.__recorder = {
        paused: ${isPaused},
        
        handleClick: function(event) {
          if (this.paused) return;
          
          const element = event.target;
          const elementInfo = {
            tagName: element.tagName,
            id: element.id,
            className: element.className,
            textContent: element.textContent.trim().substring(0, 100),
            value: element.value,
            attributes: Array.from(element.attributes).map(attr => ({
              name: attr.name,
              value: attr.value
            }))
          };
          
          window.postMessage({
            channel: 'element-clicked',
            data: elementInfo,
            source: 'recorder'
          }, '*');
        },
        
        handleInput: function(event) {
          if (this.paused) return;
          
          const element = event.target;
          if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
            const elementInfo = {
              tagName: element.tagName,
              id: element.id,
              className: element.className,
              type: element.type,
              name: element.name,
              value: element.value
            };
            
            window.postMessage({
              channel: 'input-changed',
              data: elementInfo,
              source: 'recorder'
            }, '*');
          }
        }
      };
      
      // Set up event listeners
      document.addEventListener('click', window.__recorder.handleClick.bind(window.__recorder), true);
      document.addEventListener('change', window.__recorder.handleInput.bind(window.__recorder), true);
      
      // Set up message handling
      window.addEventListener('message', function(event) {
        if (event.data && event.data.source === 'recorder-control') {
          if (event.data.action === 'pause') {
            window.__recorder.paused = true;
          } else if (event.data.action === 'resume') {
            window.__recorder.paused = false;
          }
        }
      });
      
      console.log('Recorder script injected successfully');
    `);
  };

  // Update paused state in webview
  useEffect(() => {
    if (webviewRef.current && isRecording) {
      webviewRef.current.executeJavaScript(`
        if (window.__recorder) {
          window.__recorder.paused = ${isPaused};
          console.log('Recorder paused state updated: ${isPaused}');
        }
      `);
    }
  }, [isPaused, isRecording]);

  useEffect(() => {
    const handleRecordingStop = () => {
      if (webviewRef.current) {
        webviewRef.current.src = "about:blank";
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
        src="about:blank"
        className={`webview ${isInspecting ? "inspecting" : ""}`}
        webpreferences="contextIsolation=false,nodeIntegration=true"
        allowpopups="true"
      />

      {isInspecting && (
        <div className="inspector-overlay">
          <div className="inspector-message">
            Click on an element to select it for inspection
          </div>
        </div>
      )}
    </div>
  );
}

export default BrowserView;
