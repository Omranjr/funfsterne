import { useEffect, useState, useCallback } from "react";
import { AppState, Platform } from "react-native";
import { useMutation } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import {
  requestPermissionsAsync,
  getPermissionsAsync,
  getExpoPushTokenAsync,
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  setNotificationHandler,
  type EventSubscription,
  type NotificationResponse,
  type NotificationBehavior,
} from "expo-notifications";
import { registerPushToken } from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { logSwallowed } from "@/lib/log";
import { type Platform as PlatformType } from "@funfsterne/shared-types";

export type NotificationPermissionStatus =
  | "undetermined"
  | "granted"
  | "denied";

// Configure the global foreground notification handler ONCE on module load.
// Without this, notifications received while the app is open are silently
// discarded. Calling setNotificationHandler twice with the same function
// is safe.
setNotificationHandler({
  handleNotification: async (): Promise<NotificationBehavior> => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * The response shape we rely on at runtime. The upstream type definitions
 * for `NotificationPermissionsStatus` are inconsistent across SDK versions
 * and do not reliably expose `status`, `granted`, or `canAskAgain`. We
 * declare the minimal contract we need and cast at the boundary.
 */
export type PermissionResponseShape = {
  status?: string;
  granted?: boolean;
  canAskAgain?: boolean;
  ios?: { status?: number };
};

function readCanAskAgain(response: PermissionResponseShape): boolean {
  if (typeof response.canAskAgain === "boolean") return response.canAskAgain;
  if (response.ios && typeof response.ios.status === "number") {
    return response.ios.status !== Notifications.IosAuthorizationStatus.DENIED;
  }
  return response.status !== Notifications.PermissionStatus.DENIED;
}

export function toStatus(
  response: PermissionResponseShape
): NotificationPermissionStatus {
  const granted =
    typeof response.granted === "boolean"
      ? response.granted
      : response.status === Notifications.PermissionStatus.GRANTED;
  if (granted) return "granted";
  if (readCanAskAgain(response)) return "undetermined";
  return "denied";
}

export function useNotificationPermission() {
  const [status, setStatus] = useState<NotificationPermissionStatus>(
    "undetermined"
  );
  const [canAskAgain, setCanAskAgain] = useState(true);

  const check = useCallback(async () => {
    try {
      const response = (await getPermissionsAsync()) as PermissionResponseShape;
      setStatus(toStatus(response));
      setCanAskAgain(readCanAskAgain(response));
    } catch {
      setStatus("denied");
      setCanAskAgain(false);
    }
  }, []);

  const request =
    useCallback(async (): Promise<NotificationPermissionStatus> => {
      try {
        const response =
          (await requestPermissionsAsync()) as PermissionResponseShape;
        const next = toStatus(response);
        setStatus(next);
        setCanAskAgain(readCanAskAgain(response));
        return next;
      } catch {
        setStatus("denied");
        setCanAskAgain(false);
        return "denied";
      }
    }, []);

  useEffect(() => {
    check();

    // Re-check whenever the app returns to the foreground.
    //
    // Permission can change entirely outside the app: someone who denied the
    // prompt can only re-enable it in the OS settings, and iOS/Android give
    // no callback when they do. Without this the app kept believing it was
    // denied until the next cold start -- the Account row would still read
    // "Off", and `usePushTokenSync` (which is gated on this status) would
    // never register a token, so turning notifications on in Settings
    // silently did nothing.
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") check();
    });
    return () => subscription.remove();
  }, [check]);

  return { status, canAskAgain, request, check };
}

export function useRegisterPushToken() {
  return useMutation<void, Error, { token: string; platform: PlatformType }>({
    mutationFn: async ({ token, platform }) => {
      const deviceId = await getOrCreateDeviceId();
      await registerPushToken({ deviceId, token, platform });
    },
  });
}

/**
 * Recognises the "no Firebase" failure from expo-notifications on Android.
 *
 * Matched on the message because the SDK throws a plain Error here with no
 * code to switch on. Deliberately broad: a false positive costs a slightly
 * wrong hint in a dev log, a false negative costs hours of looking in the
 * wrong place.
 */
function isFirebaseMissing(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  return /firebase|google-services|FirebaseApp/i.test(message);
}

export function useExpoPushToken() {
  const [token, setToken] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await getExpoPushTokenAsync();
      setToken(data);
      return data;
    } catch (error) {
      // Android throws here when Firebase is not configured, which is by far
      // the likeliest cause and was otherwise completely invisible.
      //
      // Called out separately because the generic log reads like a transient
      // network problem, when it is actually a permanent misconfiguration no
      // amount of retrying fixes -- and the symptom (nobody on Android ever
      // receives a notification) gives no hint where to look.
      if (__DEV__ && Platform.OS === "android" && isFirebaseMissing(error)) {
        console.warn(
          [
            "[push] Android cannot issue a push token: Firebase is not configured.",
            "",
            "  Two things are needed, and missing either one is silent:",
            "    1. google-services.json in apps/mobile/ (referenced by",
            "       expo.android.googleServicesFile in app.json)",
            "    2. an FCM V1 service account key uploaded to EAS",
            "       (eas credentials -> Android -> Google Service Account)",
            "",
            "  Until both exist, Android installs register no token and every",
            "  broadcast simply skips them.",
          ].join("\n"),
        );
      }
      logSwallowed("expo-push-token", error);
      setToken(null);
      return null;
    }
  }, []);

  return { token, refresh };
}

/**
 * Registers a listener that fires when the user taps a notification.
 * Returns an unsubscribe function. Caller should clean up in a useEffect.
 *
 * If the notification payload contains `data.discountCodeId` (or `data.url`),
 * the callback is invoked. The callback is responsible for the actual
 * navigation — this hook only detects the relevant payload.
 */
/**
 * True when a notification payload is one we route on.
 */
function isRoutablePayload(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const d = data as { discountCodeId?: unknown; url?: unknown };
  return Boolean(d.discountCodeId || d.url);
}

/**
 * Handles the notification tap that *launched* the app.
 *
 * `addNotificationResponseReceivedListener` only fires while the app is
 * already running. When the app is closed -- the normal case for a
 * marketing push -- the tap that opened it is delivered here instead, and
 * nowhere else. Without this the whole point of attaching a discount code
 * to a broadcast was lost: the customer tapped the offer and landed on the
 * home screen with no idea where it went.
 *
 * Returns true if it navigated, so the caller can avoid double-handling.
 */
export async function consumeInitialNotificationResponse(
  onDiscountCodeNotification: () => void
): Promise<boolean> {
  try {
    const response = await getLastNotificationResponseAsync();
    if (!response) return false;
    if (!isRoutablePayload(response.notification.request.content.data)) {
      return false;
    }
    onDiscountCodeNotification();
    return true;
  } catch (error) {
    // A failure to read the launch payload must never stop the app booting.
    logSwallowed("initial-notification-response", error);
    return false;
  }
}

export function onNotificationResponse(
  onDiscountCodeNotification: () => void
): () => void {
  const subscription: EventSubscription =
    addNotificationResponseReceivedListener(
      (response: NotificationResponse) => {
        if (isRoutablePayload(response.notification.request.content.data)) {
          onDiscountCodeNotification();
        }
      }
    );
  return () => subscription.remove();
}

export function getPlatformType(): PlatformType {
  return Platform.OS === "ios" ? "IOS" : "ANDROID";
}
