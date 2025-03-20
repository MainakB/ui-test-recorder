// src/main/browser-manager.js
const { EventEmitter } = require("events");
const { ipcMain } = require("electron");

class BrowserManager extends EventEmitter {
  constructor() {
    super();
    this.recording = false;
    this.isPaused = false;
    this.isInspecting = false;
    this.lastNavigationUrl = null;
    this.navigationDebounceTimeout = null;
    this.lastClickTime = 0;

    // Set up IPC listeners for events from the webview
    this.setupIpcListeners();
  }

  setupIpcListeners() {
    // Listen for events from the webview via renderer
    ipcMain.on("webview-event", (event, data) => {
      console.log("Browser manager received webview event:", data.type);

      if (!this.recording || this.isPaused) {
        console.log(
          "Event ignored: recording is",
          this.recording ? "paused" : "not active"
        );
        return;
      }

      switch (data.type) {
        case "click":
          this.handleClick(data.element);
          break;
        case "input":
          this.handleInput(data.element);
          break;
        case "navigation":
          this.handleNavigation(data.url);
          break;
      }
    });
  }

  handleClick(element) {
    console.log("Processing click on element:", element.tagName);

    // Prevent duplicate clicks (debounce)
    const now = Date.now();
    if (now - this.lastClickTime < 300) {
      console.log("Click ignored: too soon after previous click");
      return;
    }
    this.lastClickTime = now;

    this.emit("action", {
      type: "click",
      target: element.selector || element.tagName,
      selector: [
        {
          type: "css",
          value: element.selector || element.tagName,
          confidence: 100,
        },
      ],
      timestamp: now,
      _elementInfo: element,
    });
  }

  handleInput(element) {
    console.log("Processing input on element:", element.tagName);

    this.emit("action", {
      type: "input",
      target: element.selector || element.tagName,
      selector: [
        {
          type: "css",
          value: element.selector || element.tagName,
          confidence: 100,
        },
      ],
      value: element.value,
      timestamp: Date.now(),
      _elementInfo: element,
    });
  }

  handleNavigation(url) {
    console.log("Processing navigation to:", url);

    // Skip about:blank navigations
    if (url === "about:blank") {
      console.log("Navigation ignored: about:blank");
      return;
    }

    // Skip if this URL is the same as the last one we recorded
    if (url === this.lastNavigationUrl) {
      console.log("Navigation ignored: duplicate URL");
      return;
    }

    // Clear any existing debounce timeout
    if (this.navigationDebounceTimeout) {
      clearTimeout(this.navigationDebounceTimeout);
    }

    // Set a debounce timeout to prevent recording multiple navigations for the same action
    this.navigationDebounceTimeout = setTimeout(() => {
      this.lastNavigationUrl = url;

      this.emit("action", {
        type: "navigation",
        url: url,
        timestamp: Date.now(),
      });

      this.navigationDebounceTimeout = null;
    }, 500); // 500ms debounce for navigation events
  }

  async launch(url) {
    try {
      // Instead of launching a puppeteer browser, we'll just emit an event
      // to tell the renderer to navigate to the URL
      this.emit("browser-ready", { url });
      this.lastNavigationUrl = url; // Set initial URL to prevent duplicate recording
      return true;
    } catch (error) {
      console.error("Failed to initialize browser manager:", error);
      this.emit("browser-error", { error: error.message });
      return false;
    }
  }

  startRecording() {
    console.log("BrowserManager: Starting recording");
    this.recording = true;
    this.isPaused = false;
    this.emit("recording-started");
  }

  pauseRecording() {
    console.log("BrowserManager: Pausing recording");
    this.isPaused = true;
    this.emit("recording-paused");
  }

  resumeRecording() {
    console.log("BrowserManager: Resuming recording");
    this.isPaused = false;
    this.emit("recording-resumed");
  }

  stopRecording() {
    console.log("BrowserManager: Stopping recording");
    this.recording = false;
    this.isPaused = false;
    this.emit("recording-stopped");
  }

  startInspecting() {
    console.log("BrowserManager: Starting element inspection");
    this.isInspecting = true;
    this.isPaused = true;
    this.emit("inspector-activated");
  }

  stopInspecting() {
    console.log("BrowserManager: Stopping element inspection");
    this.isInspecting = false;
    this.emit("inspector-deactivated");
  }

  async close() {
    console.log("BrowserManager: Closing");
    this.emit("browser-closed");
    return true;
  }
}

module.exports = BrowserManager;
