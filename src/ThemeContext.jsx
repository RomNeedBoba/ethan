import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * Theme Context - Light/Dark Mode Management
 * 
 * Persists theme preference to localStorage
 * Respects system preference on first visit
 * 
 * Usage:
 * - Wrap your app with <ThemeProvider>
 * - Use const { theme, toggle } = useTheme() in components
 * 
 * Example:
 * ```jsx
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <MyComponent />
 *     </ThemeProvider>
 *   );
 * }
 * 
 * function MyComponent() {
 *   const { theme, toggle } = useTheme();
 *   return (
 *     <button onClick={toggle}>
 *       Current theme: {theme}
 *     </button>
 *   );
 * }
 * ```
 */

const ThemeContext = createContext();

/**
 * ThemeProvider Component
 * Wraps children with theme context and manages theme state
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 1. Check localStorage
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    
    // 2. Check system preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    // Update DOM attribute and localStorage when theme changes
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme Hook
 * Returns current theme and toggle function
 * 
 * @returns {Object} { theme: 'light'|'dark', toggle: Function }
 * @throws {Error} If used outside ThemeProvider
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
