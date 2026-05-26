import React, { useState } from "react";
import { ThemeProvider } from "./ThemeContext.jsx";
import Topbar from "./components/TopBar/Topbar.jsx";
import Home from "./Home/Home.jsx";
import PdfReader from "./pdf/PdfReader.jsx";

/**
 * Main App Component
 * - Manages global language + active mode (TTS landing vs AudioBook)
 * - Wraps app in ThemeProvider and renders Topbar + the active screen
 */
export default function App() {
  const [language, setLanguage] = useState("km");
  const [mode, setMode] = useState("tts"); // 'tts' (default landing) | 'pdf' (AudioBook)

  return (
    <ThemeProvider>
      <div className="app">
        <Topbar
          language={language}
          setLanguage={setLanguage}
          mode={mode}
          setMode={setMode}
        />
        {mode === "pdf" ? <PdfReader language={language} /> : <Home />}
      </div>
    </ThemeProvider>
  );
}