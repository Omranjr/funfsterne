import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Persists the user's notification-permission decision across app launches
 * so we don't re-show the pre-permission screen on every cold start.
 *
 * The actual OS-level permission is the source of truth at request time;
 * this flag only controls whether we present our in-app explanation first.
 *
 * Deliberately uses AsyncStorage (app-sandboxed file storage) rather than
 * expo-secure-store (iOS Keychain-backed). Keychain items survive app
 * deletion, but AsyncStorage does not -- and this flag needs to reset in
 * lockstep with the OS's own permission state, which iOS always resets to
 * "not determined" on a fresh install. Using Keychain here previously
 * caused reinstalled apps to skip the permission screen entirely (the
 * stale flag said "already handled" while the OS had actually forgotten
 * the decision), silently breaking notification opt-in after every
 * delete+reinstall.
 */

const KEY_PROMPTED = "notification_prompted_v1";

export type PromptedState = "pending" | "granted" | "denied";

export async function hasBeenPrompted(): Promise<PromptedState | null> {
  try {
    const value = await AsyncStorage.getItem(KEY_PROMPTED);
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
    await AsyncStorage.setItem(KEY_PROMPTED, state);
  } catch {
    // Best-effort persistence; the OS still remembers the real permission.
  }
}
