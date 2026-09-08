import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { AppConfig } from "../types/config";
import type { BrandAssets } from "../brand/registry";
import { getBrandAssets, getConfig } from "../brand/registry";

interface ConfigContextValue {
  config: AppConfig;
  assets: BrandAssets;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

/**
 * Publishes the registered brand to the React tree.
 *
 * Takes nothing: the brand is already registered by `configureBrand` at the
 * app entry point, and having one source of truth for it means a component
 * and a plain module can never disagree about which tenant they are in.
 */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({ config: getConfig(), assets: getBrandAssets() }),
    [],
  );
  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): AppConfig {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return ctx.config;
}

export function useBrandAssets(): BrandAssets {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error("useBrandAssets must be used within a ConfigProvider");
  }
  return ctx.assets;
}

/** Convenience: is this feature switched on for the current customer? */
export function useFeature(name: keyof AppConfig["features"]): boolean {
  return useConfig().features[name];
}

/**
 * Formats a money amount in the customer's currency and locale.
 *
 * Falls back to `symbol + amount` if the runtime has no full ICU data,
 * which is the case on some Android Hermes builds.
 */
export function formatMoney(config: AppConfig, amount: number): string {
  try {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency: config.currency,
    }).format(amount);
  } catch {
    return `${config.currencySymbol}${amount.toFixed(2)}`;
  }
}
