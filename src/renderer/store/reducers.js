const initialState = {
  isRecording: false,
  isPaused: false,
  isInspecting: false,
  currentUrl: "",
  steps: [],
  lastSaved: null,
  selectedElement: null,
  error: null,
};

export default function recorderReducer(state = initialState, action) {
  switch (action.type) {
    case "START_RECORDING":
      return {
        ...state,
        isRecording: true,
        isPaused: false,
        currentUrl: action.payload,
        steps: [],
        error: null,
      };

    case "RECORDING_STARTED":
      return {
        ...state,
        isRecording: true,
        isPaused: false,
        currentUrl: action.payload?.url || state.currentUrl,
        error: null,
      };

    case "STOP_RECORDING":
    case "RECORDING_STOPPED":
      return {
        ...state,
        isRecording: false,
        isPaused: false,
        isInspecting: false,
      };

    case "TOGGLE_PAUSE":
      return {
        ...state,
        isPaused: !state.isPaused,
      };

    case "RECORDING_PAUSED":
      return {
        ...state,
        isPaused: true,
      };

    case "RECORDING_RESUMED":
      return {
        ...state,
        isPaused: false,
      };

    case "ADD_STEP":
      return {
        ...state,
        steps: [...state.steps, action.payload],
      };

    case "SET_SELECTED_ELEMENT":
      return {
        ...state,
        selectedElement: action.payload,
        isInspecting: false,
      };

    case "ACTIVATE_INSPECTOR":
    case "INSPECTOR_ACTIVATED":
      return {
        ...state,
        isInspecting: true,
        isPaused: true,
      };

    case "RECORDING_SAVED":
      return {
        ...state,
        lastSaved: new Date().getTime(),
      };

    case "RECORDING_LOADED":
      return {
        ...state,
        steps: action.payload.steps || [],
        lastSaved: new Date().getTime(),
      };

    case "RECORDING_ERROR":
      return {
        ...state,
        error: action.payload.error,
      };

    default:
      return state;
  }
}
