import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { Button, Card } from "@/components";
import { useRequestMagicLink } from "@/hooks/useAuth";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const requestMagicLink = useRequestMagicLink();

  async function handleSubmit() {
    if (!email.trim()) return;

    try {
      await requestMagicLink.mutateAsync({ email: email.trim() });
      setSubmitted(true);
    } catch {
      // error state handled below
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Sign in with your email and we'll send you a magic link.
        </Text>

        <Card style={styles.card}>
          {submitted ? (
            <View style={styles.success}>
              <Text style={styles.successTitle}>Magic link sent!</Text>
              <Text style={styles.successText}>
                Check your inbox at {email} and tap the link to continue.
              </Text>
              <Button
                title="Back to home"
                variant="secondary"
                onPress={() => router.replace("/")}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
              />

              {requestMagicLink.isError ? (
                <Text style={styles.error}>
                  Could not send magic link. Please try again.
                </Text>
              ) : null}

              <Button
                title="Send magic link"
                variant="primary"
                onPress={handleSubmit}
                disabled={!email.trim() || requestMagicLink.isPending}
              />
            </View>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
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
  card: {
    gap: theme.spacing.md,
  },
  form: {
    gap: theme.spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.muted,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  error: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
  success: {
    gap: theme.spacing.md,
    alignItems: "center",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.primary,
    textAlign: "center",
  },
  successText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
});
