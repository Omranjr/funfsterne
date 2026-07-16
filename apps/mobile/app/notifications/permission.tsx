import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Bell, Scissors, Tag } from "lucide-react-native";
import { theme } from "@/constants/theme";
import { Button, Card } from "@/components";
import {
  useNotificationPermission,
  useExpoPushToken,
  useRegisterPushToken,
  getPlatformType,
} from "@/hooks/useNotifications";

export default function NotificationPermissionScreen() {
  const router = useRouter();
  const { status, request } = useNotificationPermission();
  const { refresh: refreshPushToken } = useExpoPushToken();
  const register = useRegisterPushToken();

  useEffect(() => {
    if (status === "granted") {
      handleGranted();
    }
  }, [status]);

  async function handleGranted() {
    const token = await refreshPushToken();
    if (token) {
      await register.mutateAsync({
        token,
        platform: getPlatformType(),
      });
    }
    router.replace("/account");
  }

  async function handleRequest() {
    const result = await request();
    if (result === "granted") {
      await handleGranted();
    } else {
      router.replace("/account");
    }
  }

  if (status === "undetermined") {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Bell size={40} fill={theme.colors.primary} />
        </View>

        <Text style={styles.title}>Stay in the loop</Text>
        <Text style={styles.subtitle}>
          Allow notifications so we can send you timely updates.
        </Text>

        <Card style={styles.benefits}>
          <View style={styles.benefit}>
            <Scissors size={20} fill={theme.colors.primary} />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Haircut reminders</Text>
              <Text style={styles.benefitDesc}>
                Never miss your next appointment.
              </Text>
            </View>
          </View>

          <View style={styles.benefit}>
            <Tag size={20} fill={theme.colors.primary} />
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>Exclusive discounts</Text>
              <Text style={styles.benefitDesc}>
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
          />
          <Button
            title="Not now"
            variant="secondary"
            onPress={() => router.replace("/account")}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textAlign: "center",
    paddingHorizontal: theme.spacing.md,
  },
  benefits: {
    width: "100%",
    gap: theme.spacing.md,
  },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  benefitText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  benefitDesc: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  actions: {
    width: "100%",
    gap: theme.spacing.md,
  },
});
