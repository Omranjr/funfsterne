import { useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import { useMutation } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import {
  requestPermissionsAsync,
  getPermissionsAsync,
  getExpoPushTokenAsync,
  addNotificationResponseReceivedListener,
  setNotificationHandler,
  type EventSubscription,
  type NotificationResponse,
  type NotificationBehavior,
} from "expo-notifications";
import { registerPushToken } from "@/lib/api";
import { getOrCreateDeviceId } from "@/lib/device-id";
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
type PermissionResponseShape = {
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

function toStatus(
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

export function useExpoPushToken() {
  const [token, setToken] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await getExpoPushTokenAsync();
      setToken(data);
      return data;
    } catch {
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
export function onNotificationResponse(
  onDiscountCodeNotification: () => void
): () => void {
  const subscription: EventSubscription =
    addNotificationResponseReceivedListener(
      (response: NotificationResponse) => {
        const data = response.notification.request.content.data as
          | { discountCodeId?: string; url?: string }
          | undefined;
        if (!data) return;
        if (data.discountCodeId || data.url) {
          onDiscountCodeNotification();
        }
      }
    );
  return () => subscription.remove();
}

export function getPlatformType(): PlatformType {
  return Platform.OS === "ios" ? "IOS" : "ANDROID";
}
