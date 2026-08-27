import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import de from "@/locales/de.json";
import ar from "@/locales/ar.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧", rtl: false },
  { code: "de", label: "Deutsch", flag: "🇩🇪", rtl: false },
  // Per product decision, Arabic is represented with the Egyptian flag
  // rather than a generic/League-of-Arab-States symbol.
  { code: "ar", label: "العربية", flag: "🇪🇬", rtl: true },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const LANGUAGE_STORAGE_KEY = "funfsterne-admin-language";

export function isSupportedLanguage(value: unknown): value is LanguageCode {
  return value === "en" || value === "de" || value === "ar";
}

export function isRTL(lang: LanguageCode): boolean {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.rtl ?? false;
}

export function detectBrowserLanguage(): LanguageCode {
  if (typeof navigator === "undefined") return "en";
  const primary = navigator.language?.slice(0, 2);
  return isSupportedLanguage(primary) ? primary : "en";
}

// Guard against re-initializing on Fast Refresh / multiple imports in dev.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      ar: { translation: ar },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
