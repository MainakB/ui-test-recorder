// src/renderer/preload.js
const { ipcRenderer } = require("electron");

console.log("UI Test Recorder: Preload script loaded in webview");

// We need to wait until the document is fully loaded
window.addEventListener("DOMContentLoaded", () => {
  console.log("UI Test Recorder: Preload script loaded in webview");

  //   // Set up mutation observer to detect DOM changes
  //   setupMutationObserver();

  // Set up event listeners for user interactions
  setupEventListeners();
});

function setupEventListeners() {
  // Capture click events
  document.addEventListener(
    "click",
    (event) => {
      try {
        const element = event.target;
        if (!element) return;

        console.log("Click detected on:", element.tagName);

        // Generate element info for IPC with multiple locator types
        const elementInfo = getElementInfo(element, event);

        // Send directly to host (BrowserView)
        console.log("Sending click event to host:", elementInfo);
        ipcRenderer.sendToHost("webview-event", {
          type: "click",
          element: elementInfo,
        });
      } catch (e) {
        console.error("Error in click handler:", e.stack);
      }
    },
    true
  );

  // Input change events (for select, checkboxes, radio buttons)
  document.addEventListener(
    "change",
    (event) => {
      try {
        const element = event.target;
        if (!element) return;

        // Only capture for form elements
        if (!isFormElement(element)) return;

        console.log("Input change detected on:", element.tagName);

        // Only process immediately if it's not a text input
        // (text inputs will be handled by the 'input' event with debouncing)
        if (
          element.tagName.toLowerCase() !== "input" ||
          (element.type !== "text" &&
            element.type !== "password" &&
            element.type !== "email" &&
            element.type !== "number" &&
            element.type !== "search" &&
            element.type !== "tel" &&
            element.type !== "url")
        ) {
          const elementInfo = getElementInfo(element, event);

          // Send directly to host (BrowserView)
          console.log("Sending input event to host:", elementInfo);
          ipcRenderer.sendToHost("webview-event", {
            type: "input",
            element: elementInfo,
          });
        }
      } catch (e) {
        console.error("Error in input handler:", e.stack);
      }
    },
    true
  );

  // Text input events (with debouncing)
  document.addEventListener(
    "input",
    (event) => {
      try {
        const element = event.target;
        if (!element || !isFormElement(element)) return;

        // For text inputs, we'll set a property to track the last value
        // to avoid duplicate events
        const currentValue = getSafeValue(element);
        if (element._lastRecordedValue === currentValue) {
          return; // Skip if the value hasn't changed
        }

        console.log("Input typing detected on:", element.tagName);

        // Store current value to prevent duplicates
        element._lastRecordedValue = currentValue;

        const elementInfo = getElementInfo(element, event);

        // Send directly to host (BrowserView)
        console.log("Sending input event to host:", elementInfo);
        ipcRenderer.sendToHost("webview-event", {
          type: "input",
          element: elementInfo,
        });
      } catch (e) {
        console.error("Error in input handler:", e.stack);
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

  function getElementInfo(element, event) {
    if (!element) return {};

    // Extract all attributes
    const attributes = {};
    if (element.attributes) {
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        attributes[attr.name] = attr.value;
      }
    }

    // Get position information if it's a click event
    const position =
      event && event.type === "click"
        ? {
            x: event.clientX,
            y: event.clientY,
            pageX: event.pageX,
            pageY: event.pageY,
            offsetX: event.offsetX,
            offsetY: event.offsetY,
          }
        : null;

    return {
      tagName: element.tagName?.toLowerCase() || "unknown",
      id: element.id || "",
      className: element.className || "",
      name: element.getAttribute("name") || "",
      type: element.getAttribute("type") || "",
      innerText: element.innerText ? element.innerText.substring(0, 50) : "",
      value: getSafeValue(element),
      href: element.href || "",
      // Multiple selector types
      selector: generateCssSelector(element),
      xpath: generateXPath(element),
      aria: {
        label: element.getAttribute("aria-label") || "",
        role: element.getAttribute("role") || "",
        labelledby: element.getAttribute("aria-labelledby") || "",
      },
      attributes,
      position,
      // For input elements, track if this is the final value
      isFinalValue: true,
    };
  }

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
    console.error("Error in navigation handler:", e.stack);
  }
}

function generateCssSelector(element) {
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

  // If no good selector, try with CSS selector
  try {
    // Use custom path algorithm for better results
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

function generateXPath(element) {
  if (!element) return "";

  const parts = [];
  let current = element;
  console.log("First: , current.id", current.id);
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    console.log("Loop: , current.id", current.id);
    let xpathPart = current.tagName.toLowerCase();

    // Check if the element has an ID
    if (current.id) {
      xpathPart = `//${current.tagName.toLowerCase()}[@id="${current.id}"]`;
      parts.push(xpathPart);
      break;
    }

    // Get position among siblings
    if (current.parentNode) {
      const siblings = Array.from(current.parentNode.children).filter(
        (child) => child.tagName === current.tagName
      );

      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        xpathPart += `[${index}]`;
      }
    }

    parts.unshift(xpathPart);
    current = current.parentNode;

    // Limit XPath depth
    if (parts.length > 6) {
      break;
    }
  }

  return "/" + parts.join("/");
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

function setupMutationObserver() {
  // Create a mutation observer to detect DOM changes
  const observer = new MutationObserver((mutations) => {
    // This can be used for more advanced features later
    // Such as detecting when elements appear/disappear
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
}
