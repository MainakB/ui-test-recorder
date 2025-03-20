const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const url = require("url");
const Store = require("electron-store");
const fs = require("fs");

// Initialize storage
const store = new Store.default();

// Keep a global reference of the window objects
let mainWindow;
let browserWindow;

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

  // Open DevTools in development mode
  if (process.argv.includes("--dev")) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
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
});

// IPC handlers
ipcMain.on("start-recording", (event, url) => {
  // Will implement browser control and recording
  console.log("Starting recording with URL:", url);
  mainWindow.webContents.send("recording-started", url);
});

ipcMain.on("stop-recording", (event) => {
  console.log("Stopping recording");
  mainWindow.webContents.send("recording-stopped");
});

ipcMain.on("save-recording", async (event, data) => {
  try {
    const { filePath } = await dialog.showSaveDialog({
      title: "Save Recording",
      defaultPath: "recording.json",
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });

    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      mainWindow.webContents.send("recording-saved", filePath);
    }
  } catch (error) {
    console.error("Error saving recording:", error);
    mainWindow.webContents.send("recording-save-error", error.message);
  }
});
