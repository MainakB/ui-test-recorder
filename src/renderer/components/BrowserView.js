// src/renderer/components/BrowserView.js
import React, { useEffect, useRef } from "react";

function BrowserView({ url }) {
  const webviewRef = useRef(null);

  useEffect(() => {
    if (url && webviewRef.current) {
      webviewRef.current.src = url;
    }
  }, [url]);

  return (
    <div className="browser-container">
      <webview
        ref={webviewRef}
        src="about:blank"
        style={{ width: "100%", height: "100%" }}
        webpreferences="contextIsolation=false"
      />
    </div>
  );
}

export default BrowserView;
