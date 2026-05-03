import React, { useState } from "react";
import { ThemeProvider } from "./ThemeContext.jsx";
import Topbar from "./components/TopBar/Topbar.jsx";
import Home from "./Home/Home.jsx";

export default function App() {
  const [language, setLanguage] = useState("km");

  return (
    <ThemeProvider>
      <div className="app">
        <Topbar language={language} setLanguage={setLanguage} />
        <Home language={language} />
      </div>
    </ThemeProvider>
  );
}