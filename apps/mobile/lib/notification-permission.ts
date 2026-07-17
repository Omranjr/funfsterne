import * as SecureStore from "expo-secure-store";

/**
 * Persists the user's notification-permission decision across app launches
 * so we don't re-show the pre-permission screen on every cold start.
 *
 * The actual OS-level permission is the source of truth at request time;
 * this flag only controls whether we present our in-app explanation first.
 */

const KEY_PROMPTED = "notification_prompted_v1";

export type PromptedState = "pending" | "granted" | "denied";

export async function hasBeenPrompted(): Promise<PromptedState | null> {
  try {
    const value = await SecureStore.getItemAsync(KEY_PROMPTED);
    if (value === "pending" || value === "granted" || value === "denied") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setPrompted(state: PromptedState): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_PROMPTED, state);
  } catch {
    // Best-effort persistence; the OS still remembers the real permission.
  }
}
