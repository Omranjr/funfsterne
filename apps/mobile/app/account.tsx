import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useArabicTextStyle } from "@/hooks/useArabicText";
import {
  useNotificationPermission,
  useExpoPushToken,
  useRegisterPushToken,
  getPlatformType,
} from "@/hooks/useNotifications";
import { PRIVACY_URL } from "@/constants/links";
import { logSwallowed } from "@/lib/log";
import { User, ChevronRight, Bell } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, screenTopPadding } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Card, Button, ThemeToggle, Ground } from "@/components";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";



/**
 * Opens the privacy policy, and says so if it cannot.
 *
 * Previously `.catch(() => {})` -- on a device with no browser able to
 * handle the URL the row simply did nothing, which is both confusing and a
 * problem for App Review, since Apple checks this link resolves.
 */
async function openPrivacyPolicy(t: (key: string) => string): Promise<void> {
  try {
    await Linking.openURL(PRIVACY_URL);
  } catch (error) {
    logSwallowed("open-privacy-policy", error);
    Alert.alert(t("common.linkFailed"));
  }
}

export default function AccountScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const arabicText = useArabicTextStyle();
  const { user, logout, deleteAccount } = useAuth();
  const { status: notificationStatus, request: requestNotifications } =
    useNotificationPermission();
  const { refresh: refreshPushToken } = useExpoPushToken();
  const { mutateAsync: registerPushToken } = useRegisterPushToken();
  const [deleting, setDeleting] = useState(false);

  const currentLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  const handleLogout = useCallback(() => {
    Alert.alert(t("account.logOutConfirmTitle"), t("account.logOutConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("account.logOut"), style: "destructive", onPress: () => logout() },
    ]);
  }, [logout, t]);

  const confirmDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (!result.ok) {
        Alert.alert(t("account.deleteErrorTitle"), result.error);
      }
    } finally {
      // `deleteAccount` always resolves today, but the button is disabled
      // off this flag -- if that ever changes, the row would sit on
      // "Deleting…" with no way back.
      setDeleting(false);
    }
    // On success, isAuthenticated flips false and the root layout's boot
    // sequence sends the user back to sign-up/log-in on its own.
  }, [deleteAccount, t]);

  // Notifications can only be turned on from here in one of two ways, and
  // which one depends on whether the OS has already asked.
  //
  //   undetermined -- they tapped "Not now" on our own pre-permission
  //                   screen, so the real OS prompt was never shown and we
  //                   can still show it.
  //   denied       -- they said no to the OS prompt itself. Neither iOS nor
  //                   Android will ever show it again, so asking is pointless
  //                   and looks broken; the only route is the system settings.
  //
  // Getting this backwards is the usual bug here: a button that re-asks does
  // nothing at all for the people most likely to press it.
  const handleNotifications = useCallback(async () => {
    if (notificationStatus === "undetermined") {
      const next = await requestNotifications();
      if (next === "granted") {
        // Register the token here rather than leaving it to
        // `usePushTokenSync`. That hook only re-syncs when the app returns
        // to the foreground, and a permission prompt is a system alert --
        // it never backgrounds the app. Without this, someone who enabled
        // notifications from this screen would receive nothing until they
        // happened to switch apps. Registration upserts, so doing it twice
        // costs one request and changes nothing.
        try {
          const token = await refreshPushToken();
          if (token) {
            await registerPushToken({ token, platform: getPlatformType() });
          }
        } catch (error) {
          // The foreground sync will retry; no need to trouble the customer.
          logSwallowed("register-after-opt-in", error);
        }
        return;
      }
      // They have now used up the one prompt the OS allows. Say where to go
      // rather than leaving the row stubbornly reading "Off".
      Alert.alert(
        t("account.notificationsBlockedTitle"),
        t("account.notificationsBlockedMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("account.openSettings"),
            onPress: () => {
              Linking.openSettings().catch((error) =>
                logSwallowed("open-settings", error),
              );
            },
          },
        ],
      );
      return;
    }

    // Granted or denied: both are changed in the same place. The status
    // refreshes on its own when the app comes back to the foreground.
    Linking.openSettings().catch((error) =>
      logSwallowed("open-settings", error),
    );
  }, [
    notificationStatus,
    requestNotifications,
    refreshPushToken,
    registerPushToken,
    t,
  ]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(t("account.deleteConfirmTitle"), t("account.deleteConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("account.deleteAccount"), style: "destructive", onPress: confirmDelete },
    ]);
  }, [confirmDelete, t]);

  return (
    <Ground>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: screenTopPadding(insets.top) }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[typography.displayLg, { color: theme.text }]}>{t("account.title")}</Text>

      <Card style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: theme.muted }]}>
          <User size={28} color={theme.gold} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[typography.bodyLg, { color: theme.text }]} numberOfLines={1}>
            {user ? `${user.firstName} ${user.lastName}` : "—"}
          </Text>
          <Text style={[typography.bodySm, { color: theme.textMuted }]} numberOfLines={1}>
            @{user?.username ?? "—"}
          </Text>
        </View>
      </Card>

      <Pressable onPress={() => router.push("/language")}>
        <Card style={styles.settingRow}>
          <Text style={styles.settingFlag}>{currentLanguage.flag}</Text>
          <Text style={[typography.bodyMd, styles.settingLabel, { color: theme.text }]}>
            {t("account.language")}
          </Text>
          <Text style={[typography.bodySm, { color: theme.textMuted }]}>
            {currentLanguage.label}
          </Text>
          <ChevronRight size={18} color={theme.textMuted} />
        </Card>
      </Pressable>

      {/* The 3a hero has no room for a theme control, so the toggle lives
          here beside Language — the app's other display preference. */}
      <Card style={styles.settingRow}>
        <Text style={[typography.bodyMd, styles.settingLabel, { color: theme.text }]}>
          {t("account.appearance")}
        </Text>
        <ThemeToggle />
      </Card>

      <Pressable onPress={handleNotifications}>
        <Card style={styles.settingRow}>
          <Bell size={18} color={theme.gold} />
          <Text style={[typography.bodyMd, styles.settingLabel, { color: theme.text }]}>
            {t("account.notifications")}
          </Text>
          <Text style={[typography.bodySm, { color: theme.textMuted }]}>
            {notificationStatus === "granted"
              ? t("account.notificationsOn")
              : t("account.notificationsOff")}
          </Text>
          <ChevronRight size={18} color={theme.textMuted} />
        </Card>
      </Pressable>

      <View style={styles.actions}>
        <Button
          title={t("account.logOut")}
          variant="secondary"
          onPress={handleLogout}
          style={styles.actionButton}
        />
        <Button
          title={deleting ? t("account.deleting") : t("account.deleteAccount")}
          variant="secondary"
          onPress={handleDeleteAccount}
          disabled={deleting}
          style={[styles.actionButton, { borderColor: theme.danger }]}
          textStyle={{ color: theme.dangerText }}
        />
      </View>

      <Text
        onPress={() => { void openPrivacyPolicy(t); }}
        accessibilityRole="link"
        style={[typography.micro, styles.privacyLink, arabicText, { color: theme.textMuted }]}
      >
        {t("account.privacyPolicy")}
      </Text>
    </ScrollView>
    </Ground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 24,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingFlag: {
    fontSize: 20,
  },
  settingLabel: {
    flex: 1,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    width: "100%",
  },
  privacyLink: {
    textTransform: "uppercase",
    textAlign: "center",
    textDecorationLine: "underline",
    marginTop: 8,
  },
});
