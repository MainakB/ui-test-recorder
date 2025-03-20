import { ipcRenderer } from "electron";

// Recording control actions
export const startRecording = (url) => (dispatch) => {
  ipcRenderer.send("start-recording", url);
  dispatch({
    type: "START_RECORDING",
    payload: url,
  });
};

export const stopRecording = () => (dispatch) => {
  ipcRenderer.send("stop-recording");
  dispatch({ type: "STOP_RECORDING" });
};

export const togglePause = () => (dispatch, getState) => {
  const { isPaused } = getState().recorder;
  ipcRenderer.send("toggle-pause", !isPaused);
  dispatch({ type: "TOGGLE_PAUSE" });
};

// Step actions
export const addStep = (step) => ({
  type: "ADD_STEP",
  payload: step,
});

export const setSelectedElement = (element) => ({
  type: "SET_SELECTED_ELEMENT",
  payload: element,
});

// Saving actions
export const saveRecording = () => (dispatch, getState) => {
  const { steps } = getState().recorder;

  const formattedSteps = steps.map((step) => {
    // Remove any internal properties before saving
    const { _id, _timestamp, ...cleanStep } = step;
    return cleanStep;
  });

  const recording = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    actions: formattedSteps,
  };

  ipcRenderer.send("save-recording", recording);
  dispatch({ type: "RECORDING_SAVED" });
};
