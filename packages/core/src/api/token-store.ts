import * as SecureStore from "expo-secure-store";
import { storageKey } from "../brand/registry";
import { logSwallowed } from "../utils/log";

const authTokenKey = () => storageKey("consumer-auth-token");

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(authTokenKey());
  } catch (error) {
    // Returning null here signs the user out for the rest of the session,
    // so a transient Keychain failure looks exactly like "not logged in".
    // Nothing better is available — without the token we cannot
    // authenticate — but it should at least be traceable.
    logSwallowed("secure-store-read", error);
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(authTokenKey(), token);
}

export async function removeAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(authTokenKey());
}
