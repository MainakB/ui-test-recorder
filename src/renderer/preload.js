// src/renderer/preload.js
window.addEventListener("DOMContentLoaded", () => {
  console.log("Preload script loaded in webview");

  // Add communication channel to main process
  window.sendToMain = (channel, data) => {
    window.postMessage({ channel, data, source: "ui-recorder" }, "*");
  };
});
