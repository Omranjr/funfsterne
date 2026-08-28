import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { User, ChevronRight } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, screenTopPadding } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Card, Button, ThemeToggle, Ground } from "@/components";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

const PRIVACY_URL = "https://funfsterne-admin-eight.vercel.app/privacy";

export default function AccountScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, logout, deleteAccount } = useAuth();
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
    const result = await deleteAccount();
    setDeleting(false);
    if (!result.ok) {
      Alert.alert(t("account.deleteErrorTitle"), result.error);
    }
    // On success, isAuthenticated flips false and the root layout's boot
    // sequence sends the user back to sign-up/log-in on its own.
  }, [deleteAccount, t]);

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
          textStyle={{ color: theme.danger }}
        />
      </View>

      <Text
        onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
        accessibilityRole="link"
        style={[typography.micro, styles.privacyLink, { color: theme.textMuted }]}
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
