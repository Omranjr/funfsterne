import { useEffect, useState, useCallback } from "react";
import {
  requestPermissionsAsync,
  getPermissionsAsync,
  getExpoPushTokenAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  type EventSubscription,
  type NotificationResponse,
} from "expo-notifications";
import { Platform } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { type PermissionResponse } from "expo-modules-core";
import { apiFetch } from "@/lib/api";
import { type Platform as PlatformType } from "@funfsterne/shared-types";

export type NotificationPermissionStatus =
  | "undetermined"
  | "granted"
  | "denied";

export function useNotificationPermission() {
  const [status, setStatus] = useState<NotificationPermissionStatus>(
    "undetermined"
  );
  const [canAskAgain, setCanAskAgain] = useState(true);

  const toStatus = useCallback(
    (response: PermissionResponse): NotificationPermissionStatus => {
      if (response.granted) return "granted";
      return (response.status as NotificationPermissionStatus) ?? "undetermined";
    },
    []
  );

  const check = useCallback(async () => {
    const response = await getPermissionsAsync();
    setStatus(toStatus(response));
    setCanAskAgain(response.canAskAgain ?? true);
  }, [toStatus]);

  const request = useCallback(async () => {
    const response = await requestPermissionsAsync();
    const next = toStatus(response);
    setStatus(next);
    setCanAskAgain(response.canAskAgain ?? true);
    return next;
  }, [toStatus]);

  useEffect(() => {
    check();
  }, [check]);

  return { status, canAskAgain, request, check };
}

export function useRegisterPushToken() {
  return useMutation<void, Error, { token: string; platform: PlatformType }>({
    mutationFn: ({ token, platform }) =>
      apiFetch<void>("/consumer/me/push-token", {
        method: "POST",
        body: JSON.stringify({ token, platform }),
      }),
  });
}

export function useExpoPushToken() {
  const [token, setToken] = useState<string | null>(null);

  const refresh = useCallback(async () => {
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

export function useNotificationDeepLink(
  onDiscountCodeNotification?: () => void
) {
  useEffect(() => {
    let subscription: EventSubscription | null = null;

    subscription = addNotificationResponseReceivedListener(
      (response: NotificationResponse) => {
        const discountCodeId =
          response.notification.request.content.data?.discountCodeId;
        if (discountCodeId) {
          onDiscountCodeNotification?.();
        }
      }
    );

    return () => {
      subscription?.remove();
    };
  }, [onDiscountCodeNotification]);
}

export function getPlatformType(): PlatformType {
  return Platform.OS === "ios" ? "IOS" : "ANDROID";
}
