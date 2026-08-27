import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import * as Updates from "expo-updates";
import { I18nManager } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const LANGUAGE_STORAGE_KEY = "funfsterne-language";

function isSupportedLanguage(value: unknown): value is LanguageCode {
  return value === "en" || value === "de" || value === "ar";
}

function detectDeviceLanguage(): LanguageCode {
  const primary = Localization.getLocales()[0]?.languageCode;
  return isSupportedLanguage(primary) ? primary : "en";
}

export function isRTL(lang: LanguageCode): boolean {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.rtl ?? false;
}

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

// Resolves the language to boot with (stored preference, else device
// locale) and applies it. Called once from the root layout before the
// first paint -- mirrors how font loading gates initial render, since a
// mid-render language swap would flash untranslated text.
export async function initI18n(): Promise<LanguageCode> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const lang = isSupportedLanguage(stored) ? stored : detectDeviceLanguage();
  await i18n.changeLanguage(lang);

  // I18nManager.isRTL only takes effect on the native side after a fresh
  // launch -- if this is the very first launch ever and the device's
  // locale is Arabic, the native layout won't be mirrored yet even though
  // we just told i18next to use Arabic strings. Force it and reload once
  // so text and layout direction start in sync.
  const wantsRTL = isRTL(lang);
  if (wantsRTL !== I18nManager.isRTL) {
    I18nManager.allowRTL(wantsRTL);
    I18nManager.forceRTL(wantsRTL);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    try {
      await Updates.reloadAsync();
    } catch {
      // Reload isn't available in every environment (e.g. some dev
      // clients) -- the RTL flag is still persisted natively and will
      // take effect on the next real app launch.
    }
  }

  return lang;
}

// Called from the language picker. Unlike initI18n, this always persists
// (the reload path aside) and reports back whether a restart is needed so
// the UI can warn the user before it happens.
export async function changeLanguage(
  lang: LanguageCode
): Promise<{ requiresRestart: boolean }> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);

  const wantsRTL = isRTL(lang);
  const requiresRestart = wantsRTL !== I18nManager.isRTL;
  if (requiresRestart) {
    I18nManager.allowRTL(wantsRTL);
    I18nManager.forceRTL(wantsRTL);
  }
  return { requiresRestart };
}

export async function restartApp(): Promise<void> {
  try {
    await Updates.reloadAsync();
  } catch {
    // Best effort -- see note in initI18n.
  }
}

export async function getCurrentLanguage(): Promise<LanguageCode> {
  const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  return isSupportedLanguage(stored) ? stored : detectDeviceLanguage();
}

export default i18n;
