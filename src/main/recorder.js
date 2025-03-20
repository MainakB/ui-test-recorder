// src/main/recorder.js
const { EventEmitter } = require("events");
const SelectorGenerator = require("./selector-generator");

class Recorder extends EventEmitter {
  constructor(browserManager) {
    super();
    this.browserManager = browserManager;
    this.recording = false;
    this.isPaused = false;
    this.steps = [];
    this.selectorGenerator = new SelectorGenerator();

    // Listen for browser events
    this.setupBrowserListeners();
  }

  setupBrowserListeners() {
    // Listen for action events from the browser
    this.browserManager.on("action", this.processAction.bind(this));
    this.browserManager.on(
      "webview-event",
      this.processWebviewEvent.bind(this)
    );
  }

  processWebviewEvent(event) {
    if (!this.recording || this.isPaused) return;

    switch (event.type) {
      case "click":
        this.handleElementClicked(event.element);
        break;
      case "input":
        this.handleInputChanged(event.element);
        break;
      case "navigation":
        // Navigation events are handled by the browser manager directly
        break;
    }
  }

  processAction(action) {
    if (!this.recording || this.isPaused) return;

    // Add the action to our steps
    this.steps.push(action);
    this.emit("step-added", action);
  }

  async handleElementClicked(element) {
    if (!element) return;
    console.log("handleElementClicked---> ", element);
    // Prepare selector array from element info

    const clickAction = {
      type: "click",
      target: this.getElementDescription(element),
      selector: await this.selectorGenerator.generateSelector(element),
      timestamp: Date.now(),
      _elementInfo: element,
    };

    this.steps.push(clickAction);
    this.emit("step-added", clickAction);
  }

  async handleInputChanged(element) {
    if (!element) return;

    const inputAction = {
      type: "input",
      selector: await this.selectorGenerator.generateSelector(element),
      value: element.value,
      target: this.getElementDescription(element),
      timestamp: Date.now(),
      _elementInfo: element,
    };

    this.steps.push(inputAction);
    this.emit("step-added", inputAction);
  }

  getElementDescription(element) {
    if (!element) return "unknown";

    if (element.id) return `#${element.id}`;
    if (element.name)
      return `${element.tagName.toLowerCase()}[name="${element.name}"]`;
    if (element.className) {
      const classes = element.className.split(" ").filter(Boolean);
      if (classes.length) return `.${classes[0]}`;
    }

    // Simplified label for the UI
    let desc = element.tagName.toLowerCase();

    // Add some context for the target
    if (element.innerText && element.innerText.length < 20) {
      desc += ` "${element.innerText.trim()}"`;
    } else if (element.type) {
      desc += ` (${element.type})`;
    }

    return desc;
  }

  async startRecording(url) {
    try {
      // Launch the browser if needed
      if (!this.browserManager.browser) {
        const launched = await this.browserManager.launch(url);
        if (!launched) {
          throw new Error("Failed to launch browser");
        }
      }

      // Clear previous steps
      this.steps = [];

      // Start recording
      this.recording = true;
      this.isPaused = false;
      this.browserManager.startRecording();

      // Add initial navigation step
      const navigationStep = {
        type: "navigation",
        url,
        timestamp: Date.now(),
      };
      this.steps.push(navigationStep);
      this.emit("step-added", navigationStep);

      this.emit("recording-started", { url });
      return true;
    } catch (error) {
      console.error("Failed to start recording:", error);
      this.emit("recording-error", { error: error.message });
      return false;
    }
  }

  pauseRecording() {
    if (this.recording && !this.isPaused) {
      this.isPaused = true;
      this.browserManager.pauseRecording();
      this.emit("recording-paused");
    }
  }

  resumeRecording() {
    if (this.recording && this.isPaused) {
      this.isPaused = false;
      this.browserManager.resumeRecording();
      this.emit("recording-resumed");
    }
  }

  async stopRecording() {
    if (this.recording) {
      // Make a copy of steps before we do anything else
      const stepsSnapshot = [...this.steps];

      // Update state
      this.recording = false;
      this.isPaused = false;

      try {
        // Tell browser manager to stop recording
        this.browserManager.stopRecording();

        // Wait a moment for any pending events
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Now emit the stopped event with our snapshot
        this.emit("recording-stopped", { steps: stepsSnapshot });

        return stepsSnapshot;
      } catch (error) {
        console.error("Error stopping recording:", error);
        // Still emit the stopped event with our snapshot
        this.emit("recording-stopped", {
          steps: stepsSnapshot,
          error: error.message,
        });
        return stepsSnapshot;
      }
    }
    return [];
  }

  async addAssertion(type, selector, value) {
    if (!this.recording) return false;

    const assertionStep = {
      type: "assert",
      assertType: type,
      selector,
      value,
      timestamp: Date.now(),
    };

    this.steps.push(assertionStep);
    this.emit("step-added", assertionStep);
    return true;
  }

  getRecording() {
    return {
      steps: this.steps,
      timestamp: Date.now(),
    };
  }
}

module.exports = Recorder;
