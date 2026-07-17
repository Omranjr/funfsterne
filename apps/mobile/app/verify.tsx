import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, EmptyState } from "@/components";
import { useVerifyMagicLink } from "@/hooks/useAuth";

export default function VerifyScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );

  const verify = useVerifyMagicLink();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    verify
      .mutateAsync({ token })
      .then(() => {
        if (!cancelled) setStatus("success");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const insets = useSafeAreaInsets();

  if (status === "verifying") {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.gold} />
        <Text style={[styles.text, { color: theme.textMuted }]}>Verifying your magic link...</Text>
      </View>
    );
  }

  if (status === "success") {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <EmptyState
          title="You're signed in"
          message="Welcome back to FünfSterne."
          actionTitle="Continue"
          onAction={() => router.replace("/account")}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <EmptyState
        title="Invalid or expired link"
        message="Please request a new magic link to sign in."
        actionTitle="Back to login"
        onAction={() => router.replace("/login")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
  },
});
