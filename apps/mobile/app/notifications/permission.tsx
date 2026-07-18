import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, Scissors, Tag } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, Card } from "@/components";
import {
  useNotificationPermission,
  useExpoPushToken,
  useRegisterPushToken,
  getPlatformType,
} from "@/hooks/useNotifications";
import { hasBeenPrompted, setPrompted } from "@/lib/notification-permission";

/**
 * Pre-permission screen shown ONCE before the OS prompt. After the user
 * makes any choice (allow or not now), this screen is never shown again.
 */
export default function NotificationPermissionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { status, canAskAgain, request } = useNotificationPermission();
  const { refresh: refreshPushToken } = useExpoPushToken();
  const register = useRegisterPushToken();
  const [isResolving, setIsResolving] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);

  // Skip this screen entirely if we've already taken the user through it
  // (regardless of their final choice), or if they've already granted.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const prompted = await hasBeenPrompted();
      if (cancelled) return;
      if (prompted !== null) {
        setHasFinished(true);
        router.replace("/discount-codes");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleGranted = useCallback(async () => {
    await setPrompted("granted");
    const token = await refreshPushToken();
    if (token) {
      try {
        await register.mutateAsync({ token, platform: getPlatformType() });
      } catch {
        // Non-fatal: if registration fails, the user can re-enable later.
      }
    }
    setHasFinished(true);
    router.replace("/discount-codes");
  }, [refreshPushToken, register, router]);

  // If the user navigates back here and permission is already granted,
  // just re-register the token and leave.
  useEffect(() => {
    if (status === "granted" && !hasFinished && !isResolving) {
      setIsResolving(true);
      handleGranted();
    }
  }, [status, hasFinished, isResolving, handleGranted]);

  const handleRequest = useCallback(async () => {
    setIsResolving(true);
    try {
      const result = await request();
      if (result === "granted") {
        await handleGranted();
        return;
      }
      // User either denied or dismissed; either way, do not re-prompt.
      await setPrompted(result === "denied" ? "denied" : "pending");
      setHasFinished(true);
      router.replace("/discount-codes");
    } finally {
      setIsResolving(false);
    }
  }, [request, handleGranted, router]);

  const handleSkip = useCallback(async () => {
    await setPrompted(canAskAgain ? "pending" : "denied");
    setHasFinished(true);
    router.replace("/discount-codes");
  }, [canAskAgain, router]);

  const insets = useSafeAreaInsets();

  if (hasFinished) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: theme.surface, borderColor: theme.gold },
        ]}
      >
        <Bell size={40} fill={theme.gold} />
      </View>

      <Text style={[styles.title, { color: theme.text }]}>Stay in the loop</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Allow notifications so we can send you timely updates.
      </Text>

      <Card style={styles.benefits}>
        <View style={styles.benefit}>
          <Scissors size={20} fill={theme.gold} />
          <View style={styles.benefitText}>
            <Text style={[styles.benefitTitle, { color: theme.text }]}>Haircut reminders</Text>
            <Text style={[styles.benefitDesc, { color: theme.textMuted }]}>
              Never miss your next appointment.
            </Text>
          </View>
        </View>

        <View style={styles.benefit}>
          <Tag size={20} fill={theme.gold} />
          <View style={styles.benefitText}>
            <Text style={[styles.benefitTitle, { color: theme.text }]}>Exclusive discounts</Text>
            <Text style={[styles.benefitDesc, { color: theme.textMuted }]}>
              Get notified when new promo codes drop.
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title="Allow notifications"
          variant="primary"
          onPress={handleRequest}
          disabled={isResolving}
        />
        <Button
          title="Not now"
          variant="secondary"
          onPress={handleSkip}
          disabled={isResolving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  benefits: {
    width: "100%",
    gap: 16,
  },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  benefitText: {
    flex: 1,
    gap: 4,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  benefitDesc: {
    fontSize: 14,
  },
  actions: {
    width: "100%",
    gap: 16,
  },
});
