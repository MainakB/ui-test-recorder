import { createStore, applyMiddleware, combineReducers } from "redux";
import { thunk } from "redux-thunk";
import recorderReducer from "./reducers";

const rootReducer = combineReducers({
  recorder: recorderReducer,
});

const store = createStore(rootReducer, applyMiddleware(thunk));

export default store;
