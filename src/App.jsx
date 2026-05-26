import React, { useState } from "react";
import { pdfjs, Document, Page } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  // PdfReader Component
export default function PdfReader({ language }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <div className="pdf-reader">
      <h2>Reading Mode (Language: {language})</h2>
      
      {/* Example Document Render */}
      <Document
        file="your-pdf-file.pdf" 
        onLoadSuccess={onDocumentLoadSuccess}
      >
        <Page pageNumber={pageNumber} />
      </Document>
      
      <p>
        Page {pageNumber} of {numPages}
      </p>
    </div>
  );
}