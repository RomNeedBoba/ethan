import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page } from "react-pdf";
import { t } from "./strings.js";
import { normalizeKhmer } from "./normalizeKhmer.js";
import "./PdfViewer.css";

// react-pdf needs its text-layer and annotation-layer styles
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MIN_SELECTION_LENGTH = 2;
const MAX_SELECTION_LENGTH = 5000;
const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * PdfViewer — uploads, renders, and captures text selection from a PDF.
 *
 * When the user selects text inside a rendered page, a floating "Generate
 * audio" button appears anchored above the selection. Clicking it calls
 * `onGenerate(text)`.
 */
export default function PdfViewer({ language, onGenerate }) {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [zoomIdx, setZoomIdx] = useState(1);
  const [loadError, setLoadError] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selection, setSelection] = useState(null);

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // File upload
  const handleFile = useCallback(
    (f) => {
      setFileError(null);
      setLoadError(null);
      if (!f) return;
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
        setFileError(t(language, "upload.invalid"));
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setFileError(t(language, "upload.tooLarge"));
        return;
      }
      setFile(f);
      setPageNum(1);
      setSelection(null);
    },
    [language]
  );

  const handleFileInput = (e) => handleFile(e.target.files?.[0]);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onDocLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoadError(null);
  };

  const onDocLoadError = (err) => {
    console.error("PDF load error:", err);
    setLoadError(t(language, "loadError"));
  };

  const changeFile = () => {
    setFile(null);
    setNumPages(null);
    setPageNum(1);
    setSelection(null);
    setLoadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Selection capture
  useEffect(() => {
    if (!file) return;

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }
      const raw = sel.toString();
      const text = normalizeKhmer(raw);
      if (text.length < MIN_SELECTION_LENGTH) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const container = containerRef.current;
      if (!container || !container.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const x = rect.left + rect.width / 2 - containerRect.left;
      const y = rect.top - containerRect.top - 8;
      setSelection({
        text: text.slice(0, MAX_SELECTION_LENGTH),
        x: Math.max(60, x),
        y: Math.max(10, y),
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [file]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setSelection(null);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [file]);

  const handleGenerateClick = () => {
    if (!selection) return;
    onGenerate(selection.text);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const zoom = ZOOM_LEVELS[zoomIdx];
  const canZoomIn = zoomIdx < ZOOM_LEVELS.length - 1;
  const canZoomOut = zoomIdx > 0;

  // Empty state (drop zone)
  if (!file) {
    return (
      <div className="pdfv">
        <div
          className={`pdfv__drop ${isDragOver ? "is-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true" className="pdfv__drop-icon">
            <path d="M12 6h18l8 8v24a4 4 0 01-4 4H12a4 4 0 01-4-4V10a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M30 6v8h8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M24 22v12M19 27l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <h2 className="pdfv__drop-title">{t(language, "upload.title")}</h2>
          <p className="pdfv__drop-hint">{t(language, "upload.hint")}</p>

          <button
            type="button"
            className="pdfv__drop-btn"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {t(language, "upload.button")}
          </button>

          {fileError && (
            <p className="pdfv__file-error" role="alert">{fileError}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileInput}
            className="pdfv__file-input"
            aria-label={t(language, "upload.button")}
          />
        </div>
      </div>
    );
  }

  // Loaded state
  return (
    <div className="pdfv">
      <div className="pdfv__toolbar">
        <div className="pdfv__toolbar-group">
          <button
            type="button"
            className="pdfv__tool-btn"
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            disabled={pageNum <= 1}
            title={t(language, "prevPage")}
            aria-label={t(language, "prevPage")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <span className="pdfv__page-indicator">
            {t(language, "page")} <strong>{pageNum}</strong> {t(language, "of")} {numPages || "—"}
          </span>

          <button
            type="button"
            className="pdfv__tool-btn"
            onClick={() => setPageNum((p) => Math.min(numPages || p, p + 1))}
            disabled={!numPages || pageNum >= numPages}
            title={t(language, "nextPage")}
            aria-label={t(language, "nextPage")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="pdfv__toolbar-group">
          <button
            type="button"
            className="pdfv__tool-btn"
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
            disabled={!canZoomOut}
            title={t(language, "zoomOut")}
            aria-label={t(language, "zoomOut")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <span className="pdfv__zoom-label">{Math.round(zoom * 100)}%</span>

          <button
            type="button"
            className="pdfv__tool-btn"
            onClick={() => setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
            disabled={!canZoomIn}
            title={t(language, "zoomIn")}
            aria-label={t(language, "zoomIn")}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <span className="pdfv__divider" aria-hidden="true" />

          <button
            type="button"
            className="pdfv__tool-btn pdfv__tool-btn--text"
            onClick={changeFile}
            title={t(language, "changeFile")}
          >
            {t(language, "changeFile")}
          </button>
        </div>
      </div>

      <div className="pdfv__canvas-wrap" ref={containerRef}>
        {loadError ? (
          <div className="pdfv__error" role="alert">{loadError}</div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={onDocLoadSuccess}
            onLoadError={onDocLoadError}
            loading={
              <div className="pdfv__loading">
                <span className="pdfv__loading-spinner" aria-hidden="true" />
                {t(language, "loading")}
              </div>
            }
            error={
              <div className="pdfv__error" role="alert">{t(language, "loadError")}</div>
            }
          >
            <Page
              pageNumber={pageNum}
              scale={zoom}
              renderTextLayer
              renderAnnotationLayer={false}
              className="pdfv__page"
              loading={
                <div className="pdfv__loading">
                  <span className="pdfv__loading-spinner" aria-hidden="true" />
                </div>
              }
            />
          </Document>
        )}

        {selection && (
          <div
            className="pdfv__popover"
            style={{
              left: `${selection.x}px`,
              top: `${selection.y}px`,
              transform: "translate(-50%, -100%)",
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <button
              type="button"
              className="pdfv__popover-btn"
              onClick={handleGenerateClick}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2.5 8h1.2M5.5 5.5v5M8 3v10M10.5 5.5v5M13 7v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span>{t(language, "selection.generate")}</span>
              <span className="pdfv__popover-count">{selection.text.length}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}