import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  useNotificationPermission,
  useExpoPushToken,
  useRegisterPushToken,
  getPlatformType,
} from "./useNotifications";
import { logSwallowed } from "@/lib/log";

/**
 * Keeps the push token registered with the API for as long as the OS says
 * notifications are allowed.
 *
 * Previously the token was registered in exactly one place: the
 * pre-permission screen, which writes its "already prompted" flag before it
 * attempts the call and is then never routed to again. So a single failed
 * registration was permanent — the user had granted permission, the app
 * said nothing, and that account could never receive a notification, with
 * no path in the UI to retry.
 *
 * That failure was not hypothetical. Registration is the first API call a
 * brand-new account makes, the client aborts at 15s, and a sleeping backend
 * takes considerably longer than that to answer its first request.
 *
 * So this re-checks on every foreground. `POST /public/auth/push-tokens`
 * upserts on the token, so a repeat costs one request and changes nothing;
 * `registeredRef` keeps it to one per token per session anyway.
 */
export function usePushTokenSync(): void {
  const { status } = useNotificationPermission();
  const { refresh } = useExpoPushToken();
  const { mutateAsync: registerToken } = useRegisterPushToken();

  // The token this session has already registered, so returning to the
  // foreground doesn't fire a redundant request every single time.
  const registeredRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const sync = useCallback(async () => {
    if (status !== "granted" || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const token = await refresh();
      // No token means the platform can't issue one — on Android that is
      // the missing Firebase config, which no amount of retrying fixes.
      if (!token || token === registeredRef.current) return;
      await registerToken({ token, platform: getPlatformType() });
      registeredRef.current = token;
    } catch (error) {
      // Deliberately left unregistered so the next foreground retries.
      logSwallowed("push-token-sync", error);
    } finally {
      inFlightRef.current = false;
    }
  }, [status, refresh, registerToken]);

  useEffect(() => {
    sync();

    const subscription = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        if (next === "active") sync();
      },
    );
    return () => subscription.remove();
  }, [sync]);
}
