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
    this.browserManager.on("page-message", this.processPageMessage.bind(this));
  }

  processAction(action) {
    if (!this.recording || this.isPaused) return;

    // Add the action to our steps
    this.steps.push(action);
    this.emit("step-added", action);
  }

  processPageMessage(message) {
    if (!this.recording || this.isPaused) return;

    if (message.type === "element-clicked") {
      this.handleElementClicked(message.data);
    } else if (message.type === "input-changed") {
      this.handleInputChanged(message.data);
    }
  }

  async handleElementClicked(data) {
    const { element } = data;

    // Generate a selector for this element
    const selector = await this.selectorGenerator.generateSelector(element);

    const clickAction = {
      type: "click",
      selector,
      target: this.getElementDescription(element),
      timestamp: data.timestamp,
    };

    this.steps.push(clickAction);
    this.emit("step-added", clickAction);
  }

  async handleInputChanged(data) {
    const { element } = data;

    // Generate a selector for this element
    const selector = await this.selectorGenerator.generateSelector(element);

    const inputAction = {
      type: "input",
      selector,
      value: element.value,
      target: this.getElementDescription(element),
      timestamp: data.timestamp,
    };

    this.steps.push(inputAction);
    this.emit("step-added", inputAction);
  }

  getElementDescription(element) {
    if (element.id) return `#${element.id}`;
    if (element.name)
      return `${element.tagName.toLowerCase()}[name="${element.name}"]`;
    if (element.className) {
      const classes = element.className.split(" ").filter(Boolean);
      if (classes.length) return `.${classes[0]}`;
    }
    return element.tagName.toLowerCase();
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

  stopRecording() {
    if (this.recording) {
      this.recording = false;
      this.isPaused = false;
      this.browserManager.stopRecording();
      this.emit("recording-stopped", { steps: this.steps });
    }
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
