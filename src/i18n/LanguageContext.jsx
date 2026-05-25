import { createContext, useContext, useEffect, useState, useCallback } from "react";
import translations, { SUPPORTED_LANGUAGES } from "./translations.js";

/**
 * LanguageContext - global app language + translation helper.
 *
 * Usage:
 *   const { lang, setLang, t } = useTranslation();
 *   <h1>{t("controls.aiModel")}</h1>
 */

const LanguageContext = createContext(null);

const DEFAULT_LANG = "en";
const STORAGE_KEY = "app_lang";

const isSupported = (code) =>
  SUPPORTED_LANGUAGES.some((l) => l.value === code);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    // 1. localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isSupported(saved)) return saved;
    } catch {
      // ignore storage errors (private mode, etc.)
    }

    // 2. browser preference
    if (typeof navigator !== "undefined" && navigator.language) {
      const browser = navigator.language.slice(0, 2).toLowerCase();
      if (isSupported(browser)) return browser;
    }

    return DEFAULT_LANG;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const setLang = useCallback((next) => {
    if (isSupported(next)) setLangState(next);
  }, []);

  /**
   * Look up a key in the active language; fall back to English; finally to the key itself.
   */
  const t = useCallback(
    (key) => {
      const bundle = translations[lang] || translations[DEFAULT_LANG];
      if (bundle && key in bundle) return bundle[key];
      const fallback = translations[DEFAULT_LANG];
      if (fallback && key in fallback) return fallback[key];
      return key;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useTranslation must be used inside <LanguageProvider>");
  }
  return ctx;
}