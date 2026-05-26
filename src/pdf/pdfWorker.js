import { pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Vite turns `?url` imports into a hashed asset URL it can serve directly.
// This avoids CDN dependencies and PDF.js version mismatches.
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;