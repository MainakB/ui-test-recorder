// src/main/index.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const Store = require("electron-store").default;

// Initialize persistent storage
const store = new Store();

// Keep a reference to prevent garbage collection
let mainWindow;

function createWindow() {
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

  // Load React app
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // On macOS re-create window when dock icon is clicked
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Auto-save on exit
app.on("before-quit", () => {
  // Save current session
  if (mainWindow) {
    mainWindow.webContents.send("save-session");
  }
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC handlers for main process
ipcMain.on("start-recording", async (event, url) => {
  // Initialize browser and start recording
  // (We'll implement this in browser-manager.js)
});

ipcMain.on("save-recording", (event, data) => {
  // Save recording data to file
  // Will handle both auto-save and manual save
});
