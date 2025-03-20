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
    this.inputDebounceTimers = new Map();

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

      //   switch (data.type) {
      //     case "click":
      //       this.handleClick(data.element);
      //       break;
      //     case "input":
      //       this.handleInput(data.element);
      //       break;
      //     case "navigation":
      //       this.handleNavigation(data.url);
      //       break;
      //   }
    });
  }

  //   handleClick(element) {
  //     console.log("Processing click on element:", element.tagName);

  //     // Prevent duplicate clicks (debounce)
  //     const now = Date.now();
  //     if (now - this.lastClickTime < 300) {
  //       console.log("Click ignored: too soon after previous click");
  //       return;
  //     }
  //     this.lastClickTime = now;

  //     // Generate multiple selector types
  //     const selectors = this.generateSelectors(element);

  //     this.emit("action", {
  //       type: "click",
  //       //   target: element.selector || element.tagName,
  //       selector: selectors,
  //       value: null,
  //       position: element.position || null,
  //       attributes: element.attributes || {},
  //       timestamp: now,
  //       _elementInfo: element,
  //     });
  //   }

  //   handleInput(element) {
  //     console.log("Processing input on element:", element.tagName);

  //     const elementId = this.getElementUniqueId(element);

  //     // Clear any existing debounce timer for this element
  //     if (this.inputDebounceTimers.has(elementId)) {
  //       clearTimeout(this.inputDebounceTimers.get(elementId));
  //     }

  //     // Set a new debounce timer
  //     const timer = setTimeout(() => {
  //       // Generate multiple selector types
  //       const selectors = this.generateSelectors(element);
  //       this.emit("action", {
  //         type: "input",
  //         // target: element.selector || element.tagName,
  //         selector: selectors,
  //         value: element.value,
  //         position: element.position || null,
  //         attributes: element.attributes || {},
  //         timestamp: Date.now(),
  //         _elementInfo: element,
  //       });
  //       // Remove the timer reference
  //       this.inputDebounceTimers.delete(elementId);
  //     }, 500); // 500ms debounce

  //     // Store the timer reference
  //     this.inputDebounceTimers.set(elementId, timer);
  //   }

  //   handleNavigation(url) {
  //     console.log("Processing navigation to:", url);

  //     // Skip about:blank navigations
  //     if (url === "about:blank") {
  //       console.log("Navigation ignored: about:blank");
  //       return;
  //     }

  //     // Skip if this URL is the same as the last one we recorded
  //     if (url === this.lastNavigationUrl) {
  //       console.log("Navigation ignored: duplicate URL");
  //       return;
  //     }

  //     // Clear any existing debounce timeout
  //     if (this.navigationDebounceTimeout) {
  //       clearTimeout(this.navigationDebounceTimeout);
  //     }

  //     // Set a debounce timeout to prevent recording multiple navigations for the same action
  //     this.navigationDebounceTimeout = setTimeout(() => {
  //       this.lastNavigationUrl = url;

  //       this.emit("action", {
  //         type: "navigation",
  //         url: url,
  //         timestamp: Date.now(),
  //       });

  //       this.navigationDebounceTimeout = null;
  //     }, 500); // 500ms debounce for navigation events
  //   }

  //   // Helper to generate unique ID for an element based on its properties
  //   getElementUniqueId(element) {
  //     const idParts = [
  //       element.tagName || "",
  //       element.id || "",
  //       element.name || "",
  //       element.type || "",
  //       element.selector || "",
  //     ];
  //     return idParts.filter(Boolean).join("_");
  //   }

  //   // Helper to generate multiple selector types
  //   generateSelectors(element) {
  //     const selectors = [];

  //     // ID selector (highest priority)
  //     if (element.id) {
  //       selectors.push({
  //         type: "id",
  //         value: element.id,
  //         confidence: 100,
  //       });
  //     }

  //     // Test ID selector (high priority)
  //     if (element.attributes && element.attributes["data-testid"]) {
  //       selectors.push({
  //         type: "testId",
  //         value: `[data-testid="${element.attributes["data-testid"]}"]`,
  //         confidence: 95,
  //       });
  //     }

  //     // Name attribute selector
  //     if (element.name) {
  //       selectors.push({
  //         type: "name",
  //         value: element.name,
  //         confidence: 90,
  //       });
  //     }

  //     // CSS selector
  //     if (element.selector) {
  //       selectors.push({
  //         type: "css",
  //         value: element.selector,
  //         confidence: 85,
  //       });
  //     }

  //     // Class selector
  //     if (element.className) {
  //       selectors.push({
  //         type: "class",
  //         value: element.className,
  //         confidence: 80,
  //       });
  //     }

  //     // Tag selector (lowest priority)
  //     if (element.tagName) {
  //       selectors.push({
  //         type: "tag",
  //         value: element.tagName,
  //         confidence: 60,
  //       });
  //     }

  //     // XPath if available
  //     if (element.xpath) {
  //       selectors.push({
  //         type: "xpath",
  //         value: element.xpath,
  //         confidence: 75,
  //       });
  //     }

  //     // If no selectors were generated, use a default one
  //     if (selectors.length === 0) {
  //       selectors.push({
  //         type: "css",
  //         value: element.tagName || "unknown",
  //         confidence: 50,
  //       });
  //     }

  //     return selectors;
  //   }

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

    // Clear any existing state
    this.lastNavigationUrl = null;
    this.lastClickTime = 0;
    this.inputDebounceTimers.clear();

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

    // Clear all input debounce timers
    for (const timer of this.inputDebounceTimers.values()) {
      clearTimeout(timer);
    }
    this.inputDebounceTimers.clear();

    // Clear navigation debounce timer
    if (this.navigationDebounceTimeout) {
      clearTimeout(this.navigationDebounceTimeout);
      this.navigationDebounceTimeout = null;
    }

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

    // Clean up timers
    for (const timer of this.inputDebounceTimers.values()) {
      clearTimeout(timer);
    }
    this.inputDebounceTimers.clear();

    if (this.navigationDebounceTimeout) {
      clearTimeout(this.navigationDebounceTimeout);
    }

    this.emit("browser-closed");
    return true;
  }
}

module.exports = BrowserManager;
