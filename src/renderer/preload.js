// src/renderer/preload.js
const { ipcRenderer } = require("electron");

console.log("UI Test Recorder: Preload script loaded in webview");

// We need to wait until the document is fully loaded
window.addEventListener("DOMContentLoaded", () => {
  console.log("UI Test Recorder: DOM Content Loaded");

  // Set up event listeners for user interactions
  setupEventListeners();
});

function setupEventListeners() {
  // Capture click events with useCapture=true to get them before they're handled
  document.addEventListener(
    "click",
    (event) => {
      try {
        const element = event.target;
        if (!element) return;

        console.log("Click detected on:", element.tagName);

        // Generate element info for IPC
        const elementInfo = {
          tagName: element.tagName?.toLowerCase() || "unknown",
          id: element.id || "",
          className: element.className || "",
          name: element.getAttribute("name") || "",
          type: element.getAttribute("type") || "",
          innerText: element.innerText
            ? element.innerText.substring(0, 50)
            : "",
          value: element.value || "",
          href: element.href || "",
          selector: generateSelector(element),
        };

        // Send directly to host (BrowserView)
        console.log("Sending click event to host:", elementInfo);
        ipcRenderer.sendToHost("webview-event", {
          type: "click",
          element: elementInfo,
        });
      } catch (e) {
        console.error("Error in click handler:", e);
      }
    },
    true
  );

  // Capture input events with useCapture=true
  document.addEventListener(
    "change",
    (event) => {
      try {
        const element = event.target;
        if (!element) return;

        // Only capture for form elements
        if (!isFormElement(element)) return;

        console.log("Input change detected on:", element.tagName);

        const elementInfo = {
          tagName: element.tagName?.toLowerCase() || "unknown",
          id: element.id || "",
          className: element.className || "",
          name: element.getAttribute("name") || "",
          type: element.getAttribute("type") || "",
          value: getSafeValue(element),
          selector: generateSelector(element),
        };

        // Send directly to host (BrowserView)
        console.log("Sending input event to host:", elementInfo);
        ipcRenderer.sendToHost("webview-event", {
          type: "input",
          element: elementInfo,
        });
      } catch (e) {
        console.error("Error in input handler:", e);
      }
    },
    true
  );

  // Also listen for input events to catch typing
  document.addEventListener(
    "input",
    (event) => {
      try {
        const element = event.target;
        if (!element || !isFormElement(element)) return;

        // Debounce input events (only send after typing pauses)
        if (element._inputTimeout) {
          clearTimeout(element._inputTimeout);
        }

        element._inputTimeout = setTimeout(() => {
          console.log("Input typing detected on:", element.tagName);

          const elementInfo = {
            tagName: element.tagName?.toLowerCase() || "unknown",
            id: element.id || "",
            className: element.className || "",
            name: element.getAttribute("name") || "",
            type: element.getAttribute("type") || "",
            value: getSafeValue(element),
            selector: generateSelector(element),
          };

          // Send directly to host (BrowserView)
          console.log("Sending input event to host:", elementInfo);
          ipcRenderer.sendToHost("webview-event", {
            type: "input",
            element: elementInfo,
          });
        }, 500); // 500ms debounce
      } catch (e) {
        console.error("Error in input handler:", e);
      }
    },
    true
  );

  // Capture URL changes via History API
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  // Override pushState to detect SPA navigation
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    notifyUrlChange();
  };

  // Override replaceState to detect SPA navigation
  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    notifyUrlChange();
  };

  // Listen for hash changes
  window.addEventListener("hashchange", () => {
    notifyUrlChange();
  });

  // Listen for actual navigation events
  window.addEventListener("popstate", () => {
    notifyUrlChange();
  });

  // Initial URL notification
  notifyUrlChange();

  console.log("UI Test Recorder: Event listeners successfully attached");
}

function notifyUrlChange() {
  try {
    console.log("Navigation detected to:", window.location.href);
    ipcRenderer.sendToHost("webview-event", {
      type: "navigation",
      url: window.location.href,
    });
  } catch (e) {
    console.error("Error in navigation handler:", e);
  }
}

function generateSelector(element) {
  if (!element) return "";

  // Try to generate a unique selector
  if (element.id) {
    return `#${element.id}`;
  }

  if (element.getAttribute("data-testid")) {
    return `[data-testid="${element.getAttribute("data-testid")}"]`;
  }

  if (element.getAttribute("name")) {
    const tagName = element.tagName.toLowerCase();
    return `${tagName}[name="${element.getAttribute("name")}"]`;
  }

  // Try with class names if they're not too generic
  if (element.className) {
    const classes = element.className.split(" ").filter(Boolean);
    if (classes.length <= 2) {
      return `.${classes.join(".")}`;
    }
  }

  // If no good selector, use a simple path
  try {
    return getCssSelectorPath(element);
  } catch (e) {
    // If all else fails, use a simpler approach
    return element.tagName.toLowerCase();
  }
}

function getCssSelectorPath(element) {
  if (!element) return "";
  if (element === document.body) return "body";

  const path = [];
  let current = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // Add id if exists
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break; // ID is unique, so we can stop here
    }

    // Add position among siblings if needed
    if (current.parentNode) {
      const siblings = Array.from(current.parentNode.children);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentNode;

    // Limit path depth to avoid extremely long selectors
    if (path.length > 4) {
      break;
    }
  }

  return path.join(" > ");
}

function isFormElement(element) {
  if (!element || !element.tagName) return false;

  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable
  );
}

function getSafeValue(element) {
  // Don't capture passwords
  if (element.type === "password") {
    return "********";
  }

  if (element.tagName.toLowerCase() === "select") {
    return element.options[element.selectedIndex]?.value || "";
  }

  return element.value || "";
}

// Notify that preload script has been loaded and set up
console.log("UI Test Recorder: Preload script setup complete");
