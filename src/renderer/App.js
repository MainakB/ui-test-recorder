// In src/renderer/App.js
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
          <StepEditor />{" "}
          {/* Make sure this is StepEditor, not another BrowserView */}
        </div>
        <div className="right-panel">
          <BrowserView />
        </div>
      </Split>
      <StatusBar />
    </div>
  );
}
