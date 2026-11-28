import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Toaster
      theme="dark"
      position="top-right"
      richColors
      closeButton
      toastOptions={{ duration: 4_000 }}
    />
  </React.StrictMode>,
);
