import React from "react";
import { ThemeProvider } from "./ThemeContext.jsx";
import Topbar from "./components/TopBar/Topbar.jsx";
import Home from "./Home/Home.jsx";

/**
 * Main App Component.
 * - ThemeProvider handles light/dark mode.
 * - LanguageProvider (in main.jsx) handles UI language.
 */
export default function App() {
  return (
    <ThemeProvider>
      <div className="app">
        <Topbar />
        <Home />
      </div>
    </ThemeProvider>
  );
}