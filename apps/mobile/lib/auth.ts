import * as SecureStore from "expo-secure-store";
import { logSwallowed } from "@/lib/log";

const AUTH_TOKEN_KEY = "consumer_auth_token";

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    // Returning null here signs the user out for the rest of the session,
    // so a transient Keychain failure looks exactly like "not logged in".
    // Nothing better is available — without the token we cannot
    // authenticate — but it should at least be traceable.
    logSwallowed("secure-store-read", error);
    return null;
  }
}

/**
 * Stores the session token, reporting whether it actually persisted.
 *
 * A Keychain write can fail (a simulator with no keystore, a device under
 * storage pressure). Left to throw, it surfaced as a failed sign-in even
 * though the account had already been created server-side -- the customer
 * saw an error, tried again, and got "username already taken". Returning
 * false instead lets the caller keep the in-memory session and carry on;
 * the only cost is signing in again next launch.
 */
export async function setAuthToken(token: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
    return true;
  } catch (error) {
    logSwallowed("secure-store-write", error);
    return false;
  }
}

/**
 * Best-effort delete. A throw here would reject `logout()`, leaving the user
 * staring at a screen that did not respond -- worse than a token that
 * lingers until it expires.
 */
export async function removeAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    logSwallowed("secure-store-delete", error);
  }
}
