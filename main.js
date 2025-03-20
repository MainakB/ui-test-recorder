// main.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const url = require("url");
const Store = require("electron-store").default;
const fs = require("fs");
const BrowserManager = require("./src/main/browser-manager");
const Recorder = require("./src/main/recorder");

// Initialize storage
const store = new Store();

// Keep global references
let mainWindow;
let browserManager;
let recorder;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
    },
  });

  // Load the index.html
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "build", "index.html"),
      protocol: "file:",
      slashes: true,
    })
  );
  mainWindow.maximize();

  // Open DevTools in development mode
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }

  // Initialize browser manager and recorder
  initRecorder();

  // Handle window closed
  mainWindow.on("closed", () => {
    if (browserManager) {
      browserManager.close();
    }
    mainWindow = null;
  });
}

function initRecorder() {
  browserManager = new BrowserManager();
  recorder = new Recorder(browserManager);

  // Set up event listeners from recorder
  recorder.on("recording-started", (data) => {
    mainWindow.webContents.send("recording-started", data);
  });

  recorder.on("recording-paused", () => {
    mainWindow.webContents.send("recording-paused");
  });

  recorder.on("recording-resumed", () => {
    mainWindow.webContents.send("recording-resumed");
  });

  recorder.on("recording-stopped", (data) => {
    mainWindow.webContents.send("recording-stopped", data);
  });

  recorder.on("step-added", (step) => {
    mainWindow.webContents.send("step-added", step);
  });

  recorder.on("recording-error", (error) => {
    mainWindow.webContents.send("recording-error", error);
  });

  // Listen for events from webview via the renderer
  ipcMain.on("webview-event", (event, data) => {
    if (browserManager) {
      // Forward to browser manager
      browserManager.emit("webview-event", data);
    }
  });
}

// Create window when app is ready
app.on("ready", createWindow);

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Re-create window on macOS when dock icon is clicked
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Auto-save on exit
app.on("before-quit", () => {
  if (mainWindow) {
    mainWindow.webContents.send("save-session-auto");
  }

  if (browserManager) {
    browserManager.close();
  }
});

// IPC handlers
ipcMain.on("start-recording", async (event, url) => {
  if (recorder) {
    const success = await recorder.startRecording(url);
    if (!success) {
      mainWindow.webContents.send("recording-error", {
        error: "Failed to start recording",
      });
    }
  }
});

ipcMain.on("pause-recording", (event) => {
  if (recorder) {
    recorder.pauseRecording();
  }
});

ipcMain.on("resume-recording", (event) => {
  if (recorder) {
    recorder.resumeRecording();
  }
});

ipcMain.on("stop-recording-and-save", async (event) => {
  if (recorder) {
    try {
      // Get recording data
      const stepsData = recorder.getRecording();

      // Stop recording
      await recorder.stopRecording();

      // Format for saving
      const formattedRecording = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        steps: stepsData.steps.map((step) => {
          // Clean up internal properties
          const { _elementInfo, ...cleanStep } = step;
          return cleanStep;
        }),
      };

      // Create recordings directory if it doesn't exist
      const recordingsDir = path.join(process.cwd(), "recordings");
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir);
      }

      // Save to file
      const fileName = `recording-${new Date()
        .toISOString()
        .replace(/:/g, "-")}.json`;
      const filePath = path.join(recordingsDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(formattedRecording, null, 2));

      // Notify renderer
      mainWindow.webContents.send("recording-saved", { filePath });
    } catch (error) {
      console.error("Error stopping and saving recording:", error);
      mainWindow.webContents.send("recording-error", {
        error: "Failed to save recording: " + error.message,
      });
    }
  }
});

ipcMain.on("add-assertion", async (event, data) => {
  if (recorder) {
    const { type, selector, value } = data;
    await recorder.addAssertion(type, selector, value);
  }
});

ipcMain.on("save-recording", async (event, overridePath) => {
  try {
    if (!recorder) {
      throw new Error("Recorder not initialized");
    }

    const recording = recorder.getRecording();

    let filePath = overridePath;
    if (!filePath) {
      const dialogResult = await dialog.showSaveDialog({
        title: "Save Recording",
        defaultPath: "recording.json",
        filters: [{ name: "JSON Files", extensions: ["json"] }],
      });

      filePath = dialogResult.filePath;
      if (!filePath) return; // User cancelled
    }

    // Format the recording for export
    const formattedRecording = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      steps: recording.steps.map((step) => {
        // Clean up step data for export
        const { _elementInfo, ...cleanStep } = step;
        return cleanStep;
      }),
    };

    fs.writeFileSync(filePath, JSON.stringify(formattedRecording, null, 2));

    // Save last auto-save timestamp
    store.set("lastSaved", new Date().getTime());

    mainWindow.webContents.send("recording-saved", filePath);
  } catch (error) {
    console.error("Error saving recording:", error);
    mainWindow.webContents.send("recording-save-error", error.message);
  }
});

ipcMain.on("load-recording", async (event) => {
  try {
    const dialogResult = await dialog.showOpenDialog({
      title: "Load Recording",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
      properties: ["openFile"],
    });

    if (dialogResult.canceled || !dialogResult.filePaths.length) return;

    const filePath = dialogResult.filePaths[0];
    const fileContent = fs.readFileSync(filePath, "utf8");
    const recording = JSON.parse(fileContent);

    mainWindow.webContents.send("recording-loaded", recording);
  } catch (error) {
    console.error("Error loading recording:", error);
    mainWindow.webContents.send("recording-load-error", error.message);
  }
});

// Handle inspect element
ipcMain.on("inspect-element", async (event) => {
  if (browserManager) {
    browserManager.startInspecting();
  }
});
