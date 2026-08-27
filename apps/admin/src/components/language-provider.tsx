"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import i18n, {
  SUPPORTED_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  isRTL,
  detectBrowserLanguage,
  type LanguageCode,
} from "@/lib/i18n";

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyDirection(lang: LanguageCode) {
  document.documentElement.lang = lang;
  document.documentElement.dir = isRTL(lang) ? "rtl" : "ltr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const lang = isSupportedLanguage(stored) ? stored : detectBrowserLanguage();
    i18n.changeLanguage(lang);
    applyDirection(lang);
    setLanguageState(lang);
  }, []);

  const setLanguage = useCallback((lang: LanguageCode) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    i18n.changeLanguage(lang);
    applyDirection(lang);
    setLanguageState(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}

export { SUPPORTED_LANGUAGES };
