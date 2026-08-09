import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, Button } from "@/components";

const PRIVACY_URL = "https://funfsterne-admin-eight.vercel.app/privacy";

export default function AccountScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleLogout = useCallback(() => {
    Alert.alert("Log out?", "You can log back in any time with your username and password.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout() },
    ]);
  }, [logout]);

  const confirmDelete = useCallback(async () => {
    setDeleting(true);
    const result = await deleteAccount();
    setDeleting(false);
    if (!result.ok) {
      Alert.alert("Couldn't delete account", result.error);
    }
    // On success, isAuthenticated flips false and the root layout's boot
    // sequence sends the user back to sign-up/log-in on its own.
  }, [deleteAccount]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete your account?",
      "This permanently removes your name, username, and password. It can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: confirmDelete },
      ]
    );
  }, [confirmDelete]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.text }]}>Account</Text>

      <Card style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: theme.muted }]}>
          <User size={28} color={theme.gold} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {user ? `${user.firstName} ${user.lastName}` : "—"}
          </Text>
          <Text style={[styles.username, { color: theme.textMuted }]} numberOfLines={1}>
            @{user?.username ?? "—"}
          </Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          title="Log out"
          variant="secondary"
          onPress={handleLogout}
          style={styles.actionButton}
        />
        <Button
          title={deleting ? "Deleting…" : "Delete account"}
          variant="secondary"
          onPress={handleDeleteAccount}
          disabled={deleting}
          style={[styles.actionButton, { borderColor: "#EF4444" }]}
          textStyle={{ color: "#EF4444" }}
        />
      </View>

      <Text
        onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
        accessibilityRole="link"
        style={[styles.privacyLink, { color: theme.textMuted }]}
      >
        Privacy Policy
      </Text>
    </ScrollView>
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
  title: {
    fontSize: 24,
    fontWeight: "800",
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
  name: {
    fontSize: 17,
    fontWeight: "700",
  },
  username: {
    fontSize: 14,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    width: "100%",
  },
  privacyLink: {
    fontSize: 13,
    textAlign: "center",
    textDecorationLine: "underline",
    marginTop: 8,
  },
});
