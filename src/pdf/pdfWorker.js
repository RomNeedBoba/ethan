import * as pdfjsLib from 'pdfjs-dist';

// If you are using pdfjs-dist v4.x (Modern):
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs', // try .mjs instead of .min.mjs
  import.meta.url
).toString();

// ----------------------------------------------------
// OR, if you are using pdfjs-dist v3.x (Older):
// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
//  'pdfjs-dist/build/pdf.worker.min.js', 
//  import.meta.url
// ).toString();