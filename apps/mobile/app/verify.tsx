import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { Button, EmptyState } from "@/components";
import { useVerifyMagicLink } from "@/hooks/useAuth";

export default function VerifyScreen() {
  const router = useRouter();
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
  }, [token]);

  if (status === "verifying") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.text}>Verifying your magic link...</Text>
      </View>
    );
  }

  if (status === "success") {
    return (
      <View style={styles.container}>
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
    <View style={styles.container}>
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
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  text: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textMuted,
  },
});
