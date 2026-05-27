import React, { useState, useRef, useEffect } from "react";
import "./Topbar.css";
import logo from "./IDRI.png";
import { useTheme } from "../../ThemeContext.jsx";

/**
 * Topbar Component - Navigation Header
 *
 * - Hamburger menu: AudioBook on top, then Research/Feedback/About
 * - Logo: click returns to TTS landing page
 * - Language selector (Khmer, English, Chinese, French)
 * - Dark/Light theme toggle
 */

const LANGUAGES = [
  { value: "km", label: "ភាសាខ្មែរ", labelEn: "Khmer" },
  { value: "en", label: "English", labelEn: "English" },
  { value: "zh", label: "中文 (普通话)", labelEn: "Chinese" },
  { value: "fr", label: "Français", labelEn: "French" },
];

export default function Topbar({ language, setLanguage, mode, setMode }) {
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const menuRef = useRef(null);
  const langRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const selectedLang = LANGUAGES.find((l) => l.value === language) || LANGUAGES[0];

  const goToMode = (next) => {
    setMode?.(next);
    setMenuOpen(false);
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="topbar__menu-wrap" ref={menuRef}>
          <button
            className="topbar__icon-btn"
            onClick={() => setMenuOpen((v) => !v)}
            title="Navigation menu"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {menuOpen && (
            <div className="topbar__dropdown" role="menu">
              <button
                type="button"
                className={`topbar__dropdown-item ${mode === "pdf" ? "is-active" : ""}`}
                onClick={() => goToMode("pdf")}
                role="menuitem"
                aria-current={mode === "pdf" ? "page" : undefined}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 2h7l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M6 9.5l2 1.5 2-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                AudioBook
              </button>

              <div className="topbar__dropdown-divider" role="separator" aria-hidden="true" />

              <a
                className="topbar__dropdown-item"
                href="https://www.idri.edu.kh/research/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                role="menuitem"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 13V3a1 1 0 011-1h6l4 4v7a1 1 0 01-1 1H3a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                Research
              </a>

              <a
                className="topbar__dropdown-item"
                href="https://forms.gle/M3cQLnpYBmCPp78D6"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                role="menuitem"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 10.5l-1.5 3 3-1.5h6.5a1.5 1.5 0 001.5-1.5V4a1.5 1.5 0 00-1.5-1.5h-7A1.5 1.5 0 002.5 4v6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M5.5 6h5M5.5 8.5h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                Feedback
              </a>

              <a
                className="topbar__dropdown-item"
                href="https://www.idri.edu.kh/about/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                role="menuitem"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 7.5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <circle cx="8" cy="5.5" r="0.75" fill="currentColor" />
                </svg>
                About
              </a>
            </div>
          )}
        </div>

        <button
          type="button"
          className="topbar__logo topbar__logo-btn"
          onClick={() => setMode?.("tts")}
          aria-label="Go to home"
          title="Home"
        >
          <img src={logo} alt="IDRI Logo" className="topbar__logo-img" />
        </button>
      </div>

      <div className="topbar__right">
        <div className="topbar__lang-wrap" ref={langRef}>
          <button
            className="topbar__lang-btn"
            onClick={() => setLangOpen((v) => !v)}
            title="Select language"
            aria-label="Language selection"
            aria-expanded={langOpen}
            aria-haspopup="listbox"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <ellipse cx="8" cy="8" rx="3" ry="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M2 6h12M2 10h12" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span className="topbar__lang-label">{selectedLang.labelEn}</span>
            <svg
              className={`topbar__chevron ${langOpen ? "is-up" : ""}`}
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {langOpen && (
            <div className="topbar__dropdown topbar__dropdown--right" role="listbox">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  className={`topbar__dropdown-item ${l.value === language ? "is-active" : ""}`}
                  onClick={() => {
                    setLanguage(l.value);
                    setLangOpen(false);
                  }}
                  role="option"
                  aria-selected={l.value === language}
                  aria-current={l.value === language ? "true" : "false"}
                >
                  <span>{l.label}</span>
                  {l.value === language && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="topbar__icon-btn"
          onClick={toggle}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle dark/light theme"
        >
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M14.3 3.7l-1.4 1.4M5.1 12.9l-1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M15.1 10.4A6.5 6.5 0 017.6 2.9a7 7 0 107.5 7.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}