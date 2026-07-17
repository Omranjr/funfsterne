import * as SecureStore from "expo-secure-store";

const ONBOARDING_KEY = "hasSeenOnboarding";

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

export async function setHasSeenOnboarding(seen: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(ONBOARDING_KEY, String(seen));
  } catch {
    // Non-fatal: onboarding will simply show again next launch.
  }
}
