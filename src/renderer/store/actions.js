import { ipcRenderer } from "electron";

// Recording control actions
export const startRecording = (url) => (dispatch) => {
  ipcRenderer.send("start-recording", url);
  dispatch({
    type: "START_RECORDING",
    payload: url,
  });
};

export const stopRecording = () => (dispatch, getState) => {
  ipcRenderer.send("stop-recording-and-save");
  dispatch({ type: "STOP_RECORDING" });
};

export const togglePause = () => (dispatch, getState) => {
  const { isPaused } = getState().recorder;
  if (isPaused) {
    ipcRenderer.send("resume-recording");
  } else {
    ipcRenderer.send("pause-recording");
  }
  dispatch({ type: "TOGGLE_PAUSE" });
};

export const inspectElement = () => (dispatch) => {
  ipcRenderer.send("inspect-element");
  dispatch({ type: "ACTIVATE_INSPECTOR" });
};

// Step actions
export const addStep = (step) => ({
  type: "ADD_STEP",
  payload: step,
});

export const addAssertion = (assertionType, selector, value) => (dispatch) => {
  ipcRenderer.send("add-assertion", {
    type: assertionType,
    selector,
    value,
  });
};

export const setSelectedElement = (element) => ({
  type: "SET_SELECTED_ELEMENT",
  payload: element,
});

// Saving actions
export const saveRecording = () => (dispatch, getState) => {
  const { steps } = getState().recorder;

  ipcRenderer.send("save-recording");
  // The actual save operation will happen in the main process
};

export const loadRecording = () => (dispatch) => {
  ipcRenderer.send("load-recording");
};

// Initialize IPC listeners
export const initializeIpcListeners = () => (dispatch) => {
  ipcRenderer.on("recording-started", (event, data) => {
    dispatch({ type: "RECORDING_STARTED", payload: data });
  });

  ipcRenderer.on("recording-paused", () => {
    dispatch({ type: "RECORDING_PAUSED" });
  });

  ipcRenderer.on("recording-resumed", () => {
    dispatch({ type: "RECORDING_RESUMED" });
  });

  ipcRenderer.on("recording-stopped", (event, data) => {
    dispatch({ type: "RECORDING_STOPPED", payload: data });
  });

  ipcRenderer.on("step-added", (event, step) => {
    dispatch({ type: "ADD_STEP", payload: step });
  });

  ipcRenderer.on("recording-saved", (event, filePath) => {
    dispatch({ type: "RECORDING_SAVED", payload: filePath });
  });

  ipcRenderer.on("recording-loaded", (event, recording) => {
    dispatch({ type: "RECORDING_LOADED", payload: recording });
  });

  ipcRenderer.on("inspector-activated", () => {
    dispatch({ type: "INSPECTOR_ACTIVATED" });
  });

  ipcRenderer.on("element-selected", (event, element) => {
    dispatch({ type: "SET_SELECTED_ELEMENT", payload: element });
  });

  ipcRenderer.on("recording-error", (event, error) => {
    dispatch({ type: "RECORDING_ERROR", payload: error });
  });
};
