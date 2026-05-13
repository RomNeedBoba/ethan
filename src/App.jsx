import React, { useState } from "react";
import { ThemeProvider } from "./ThemeContext.jsx";
import Topbar from "./components/TopBar/Topbar.jsx";
import Home from "./Home/Home.jsx";

/**
 * Main App Component
 * Wraps the application with theme provider and renders top navigation + home page
 */
export default function App() {
  const [language, setLanguage] = useState("km");

  return (
    <ThemeProvider>
      <div className="app">
        <Topbar language={language} setLanguage={setLanguage} />
        <Home />
      </div>
    </ThemeProvider>
  );
}
