// src/main/browser-manager.js
const { EventEmitter } = require("events");

class BrowserManager extends EventEmitter {
  constructor() {
    super();
    this.recording = false;
    this.isPaused = false;
  }

  async launch(url) {
    try {
      // Instead of launching a puppeteer browser, we'll just emit an event
      // to tell the renderer to navigate to the URL
      this.emit("browser-ready", { url });

      // No need to create a page or browser variable
      return true;
    } catch (error) {
      console.error("Failed to initialize browser manager:", error);
      this.emit("browser-error", { error: error.message });
      return false;
    }
  }

  async setupEventListeners() {
    // Listeners will be set up in the renderer process
  }

  startRecording() {
    this.recording = true;
    this.isPaused = false;
    this.emit("recording-started");
  }

  pauseRecording() {
    this.isPaused = true;
    this.emit("recording-paused");
  }

  resumeRecording() {
    this.isPaused = false;
    this.emit("recording-resumed");
  }

  stopRecording() {
    this.recording = false;
    this.isPaused = false;
    this.emit("recording-stopped");
  }

  async close() {
    // No browser to close anymore
    this.emit("browser-closed");
    return true;
  }
}

module.exports = BrowserManager;
