import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import store from "./store";
import { initializeIpcListeners } from "./store/actions";
import App from "./App";
import "./styles/global.css";

// Initialize IPC listeners
store.dispatch(initializeIpcListeners());

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
