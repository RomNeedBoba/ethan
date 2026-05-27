import React from "react";
import ReactDOM from "react-dom/client";
import * as pdfjsLib from "pdfjs-dist";

// Initialize PDF worker for v3.x
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

import App from "./App.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
import "./styles/globals.css";
import "./styles/theme.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
