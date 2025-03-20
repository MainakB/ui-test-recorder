const puppeteer = require("puppeteer");
const { EventEmitter } = require("events");

class BrowserManager extends EventEmitter {
  constructor() {
    super();
    this.browser = null;
    this.page = null;
    this.recording = false;
    this.isPaused = false;
  }

  async launch(url) {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--start-maximized"],
      });

      this.page = await this.browser.newPage();

      // Setup page event listeners
      await this.setupEventListeners();

      // Navigate to the URL
      await this.page.goto(url, { waitUntil: "networkidle2" });

      this.emit("browser-ready", { url });
      return true;
    } catch (error) {
      console.error("Failed to launch browser:", error);
      this.emit("browser-error", { error: error.message });
      return false;
    }
  }

  async setupEventListeners() {
    // Capture navigation events
    this.page.on("framenavigated", async (frame) => {
      if (frame === this.page.mainFrame() && this.recording && !this.isPaused) {
        const url = frame.url();
        this.emit("action", {
          type: "navigation",
          url,
          timestamp: Date.now(),
        });
      }
    });

    // Inject the recorder script
    await this.page.evaluateOnNewDocument(() => {
      // Track clicks
      document.addEventListener(
        "click",
        (event) => {
          if (!window.__recorderPaused && event.target) {
            const target = event.target;
            window.__lastClicked = {
              tagName: target.tagName,
              id: target.id,
              className: target.className,
              textContent: target.textContent,
              value: target.value,
              type: target.type,
              name: target.name,
              href: target.href,
            };

            // Send to main process
            window.__sendToMain("element-clicked", {
              element: window.__lastClicked,
              timestamp: Date.now(),
            });
          }
        },
        true
      );

      // Track inputs (focusing on whole inputs, not keystrokes)
      document.addEventListener(
        "change",
        (event) => {
          if (!window.__recorderPaused && event.target) {
            const target = event.target;
            if (
              target.tagName === "INPUT" ||
              target.tagName === "TEXTAREA" ||
              target.tagName === "SELECT"
            ) {
              window.__sendToMain("input-changed", {
                element: {
                  tagName: target.tagName,
                  id: target.id,
                  className: target.className,
                  type: target.type,
                  name: target.name,
                  value: target.value,
                },
                timestamp: Date.now(),
              });
            }
          }
        },
        true
      );

      // Setup communication between page and main process
      window.__recorderPaused = false;
      window.__sendToMain = (channel, data) => {
        window.postMessage({ channel, data, source: "recorder" }, "*");
      };

      console.log("Recorder script injected successfully");
    });

    // Listen for messages from the page
    this.page.on("console", (message) => {
      console.log(`Browser console: ${message.text()}`);
    });

    // Setup a client for messages
    const client = await this.page.target().createCDPSession();

    // Route messages from the page to main process
    this.page.on("pageerror", (error) => {
      console.error("Page error:", error.message);
    });

    // Listen for messages from the injected script
    await client.send("Runtime.enable");
    client.on("Runtime.consoleAPICalled", async (params) => {
      if (params.type === "log" && params.args && params.args.length > 0) {
        try {
          const message = params.args[0].value;
          if (message && message.startsWith("RECORDER:")) {
            // Parse recorder messages
            const data = JSON.parse(message.replace("RECORDER:", ""));
            this.emit("page-message", data);
          }
        } catch (e) {
          // Not a recorder message, ignore
        }
      }
    });
  }

  startRecording() {
    this.recording = true;
    this.isPaused = false;

    // Tell the page we're recording
    this.page.evaluate(() => {
      window.__recorderPaused = false;
      console.log("Recording started");
    });

    this.emit("recording-started");
  }

  pauseRecording() {
    this.isPaused = true;

    // Tell the page we're paused
    this.page.evaluate(() => {
      window.__recorderPaused = true;
      console.log("Recording paused");
    });

    this.emit("recording-paused");
  }

  resumeRecording() {
    this.isPaused = false;

    // Tell the page we're resuming
    this.page.evaluate(() => {
      window.__recorderPaused = false;
      console.log("Recording resumed");
    });

    this.emit("recording-resumed");
  }

  stopRecording() {
    this.recording = false;
    this.isPaused = false;

    // Tell the page we're stopping
    this.page.evaluate(() => {
      window.__recorderPaused = true;
      console.log("Recording stopped");
    });

    this.emit("recording-stopped");
  }

  async captureScreenshot() {
    try {
      const screenshot = await this.page.screenshot({ encoding: "base64" });
      return screenshot;
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      return null;
    }
  }

  async getElementInfo(selector) {
    try {
      const elementInfo = await this.page.evaluate((selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;

        return {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          textContent: element.textContent.trim().substring(0, 100),
          value: element.value,
          isVisible: element.offsetParent !== null,
          attributes: Array.from(element.attributes).map((attr) => ({
            name: attr.name,
            value: attr.value,
          })),
        };
      }, selector);

      return elementInfo;
    } catch (error) {
      console.error("Failed to get element info:", error);
      return null;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      this.emit("browser-closed");
    }
  }
}

module.exports = BrowserManager;
