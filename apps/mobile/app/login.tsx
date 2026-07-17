import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, Card } from "@/components";
import { useRequestMagicLink } from "@/hooks/useAuth";

export default function LoginScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { height } = useWindowDimensions();
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

  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { minHeight: height - 120, paddingTop: insets.top + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Sign in with your email and we'll send you a magic link.
        </Text>

        <Card style={styles.card}>
          {submitted ? (
            <View style={styles.success}>
              <Text style={[styles.successTitle, { color: theme.gold }]}>Magic link sent!</Text>
              <Text style={[styles.successText, { color: theme.textMuted }]}>
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
              <Text style={[styles.label, { color: theme.text }]}>Email address</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.muted,
                    color: theme.text,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.textMuted}
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
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 24,
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
  card: {
    gap: 16,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    minHeight: 48,
  },
  error: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
  success: {
    gap: 16,
    alignItems: "center",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  successText: {
    fontSize: 14,
    textAlign: "center",
  },
});
