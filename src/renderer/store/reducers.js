const initialState = {
  isRecording: false,
  isPaused: false,
  currentUrl: "",
  steps: [],
  lastSaved: null,
  selectedElement: null,
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
      };

    case "STOP_RECORDING":
      return {
        ...state,
        isRecording: false,
        isPaused: false,
      };

    case "TOGGLE_PAUSE":
      return {
        ...state,
        isPaused: !state.isPaused,
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
      };

    case "RECORDING_SAVED":
      return {
        ...state,
        lastSaved: new Date().getTime(),
      };

    default:
      return state;
  }
}
