import React from "react";
import ReactDOM from "react-dom/client";
import { pdfjs } from "react-pdf";

// Use the exact pdfjs build that react-pdf ships with (v5), so the worker
// version always matches the API version. Vite resolves this to a hashed,
// served asset URL via the `?url` suffix.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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