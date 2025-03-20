import React from "react";
import Split from "react-split";
import ControlPanel from "./components/ControlPanel";
import StepEditor from "./components/StepEditor";
import BrowserView from "./components/BrowserView";
import StatusBar from "./components/StatusBar";
import "./styles/App.css";

function App() {
  return (
    <div className="app-container">
      <Split
        sizes={[30, 70]}
        direction="horizontal"
        className="split-pane"
        minSize={200}
      >
        <div className="left-panel">
          <ControlPanel />
          <StepEditor />
        </div>
        <div className="right-panel">
          <BrowserView />
        </div>
      </Split>
      <StatusBar />
    </div>
  );
}

export default App;
