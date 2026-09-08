/**
 * @funfsterne/core — everything that is the same for every white-label app.
 *
 * A customer app imports exactly two things from here in normal use:
 * `createAppRoot` (its `app/_layout.tsx`) and the screen modules its route
 * files re-export. Everything else is exported for the rarer case of a
 * customer that needs to compose its own screen.
 *
 * Nothing in this package may hardcode a brand colour, string, URL, asset
 * or tenant id. See `docs/WHITE_LABEL.md`.
 */

// ── App entry ────────────────────────────────────────────────────────────
export { createAppRoot, RootLayout } from "./navigation/RootLayout";

// ── Brand registry ───────────────────────────────────────────────────────
export {
  configureBrand,
  getConfig,
  getThemes,
  getBrandAssets,
  getBrandTranslations,
  storageKey,
  type BrandDefinition,
  type BrandAssets,
  type BrandTranslations,
  type IntroVariant,
  getIntroVariant,
} from "./brand/registry";

// ── Config ───────────────────────────────────────────────────────────────
export type { AppConfig } from "./types/config";
export { defaultConfig } from "./config/defaultConfig";
export {
  ConfigProvider,
  useConfig,
  useBrandAssets,
  useFeature,
  formatMoney,
} from "./config/ConfigContext";

// ── Theme ────────────────────────────────────────────────────────────────
export type {
  AppTheme,
  BrandTheme,
  RuntimeTheme,
  Theme,
  ThemeMode,
} from "./theme/types";
export {
  defaultTheme,
  defaultDarkTheme,
  defaultLightTheme,
  NEUTRAL_TOKENS,
} from "./theme/defaultTheme";
export { createThemes, createRuntimeTheme } from "./theme/createThemes";
export { ThemeProvider, useTheme } from "./theme/ThemeContext";
export {
  spacing,
  borderRadius,
  screenTopPadding,
  typography,
  createTypography,
  SHARED_TOKENS,
  fallbackTheme,
} from "./theme/tokens";
export { withAlpha, mix, darken, lighten, parseColor } from "./theme/color";

// ── Screens (re-exported by each app's expo-router route files) ──────────
export { default as HomeScreen } from "./screens/HomeScreen";
export { default as ProductsScreen } from "./screens/ProductsScreen";
export { default as ProductDetailScreen } from "./screens/ProductDetailScreen";
export { default as DiscountCodesScreen } from "./screens/DiscountCodesScreen";
export { default as LoyaltyScreen } from "./screens/LoyaltyScreen";
export { default as AccountScreen } from "./screens/AccountScreen";
export { default as BranchesScreen } from "./screens/BranchesScreen";
export { default as LanguageScreen } from "./screens/LanguageScreen";
export { default as NotificationPermissionScreen } from "./screens/NotificationPermissionScreen";

// ── Components ───────────────────────────────────────────────────────────
export * from "./components";

// ── Hooks ────────────────────────────────────────────────────────────────
export * from "./hooks/usePublicData";
export * from "./hooks/useNotifications";
export { usePushTokenSync } from "./hooks/usePushTokenSync";
export { useAppFonts } from "./hooks/useFonts";
export { useReduceMotion } from "./hooks/useReduceMotion";
export { useSlowOperation } from "./hooks/useSlowOperation";

// ── Stores ───────────────────────────────────────────────────────────────
export { AuthProvider, useAuth } from "./stores/AuthContext";
export { queryClient } from "./stores/query-client";
export {
  createPersister,
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
} from "./stores/persist-client";

// ── API client ───────────────────────────────────────────────────────────
export * from "./api/client";
export {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
} from "./api/token-store";

// ── i18n ─────────────────────────────────────────────────────────────────
export {
  default as i18n,
  initI18n,
  changeLanguage,
  getCurrentLanguage,
  restartApp,
  isRTL,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from "./i18n";

// ── Utils ────────────────────────────────────────────────────────────────
export { formatPrice } from "./utils/format-price";
export { logSwallowed } from "./utils/log";
export { getOrCreateDeviceId } from "./utils/device-id";
export {
  hasBeenPrompted,
  setPrompted,
  type PromptedState,
} from "./utils/notification-permission";
