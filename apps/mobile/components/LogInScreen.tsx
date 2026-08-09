import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { Input } from "./Input";
import { Button } from "./Button";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

export interface LogInScreenProps {
  onSwitchToSignUp: () => void;
  testID?: string;
}

export function LogInScreen({ onSwitchToSignUp, testID }: LogInScreenProps) {
  const { theme } = useTheme();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setFormError(null);

    if (!username.trim() || !password) {
      setFormError("Enter your username and password.");
      return;
    }

    setSubmitting(true);
    const result = await login({ username: username.trim(), password });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error);
    }
  }, [username, password, login]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID={testID}
      >
        <View style={styles.header}>
          <Image
            source={require("../assets/icon.png")}
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory"
          />
          <Text style={[styles.title, { color: theme.gold }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Log in with your username and password.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {formError ? (
            <Text style={styles.formError}>{formError}</Text>
          ) : null}

          <Button
            title={submitting ? "Logging in…" : "Log in"}
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
          />

          <Pressable
            onPress={onSwitchToSignUp}
            style={styles.switchLink}
            accessibilityRole="button"
          >
            <Text style={[styles.switchText, { color: theme.textMuted }]}>
              New here?{" "}
              <Text style={{ color: theme.gold, fontWeight: "700" }}>
                Create an account
              </Text>
            </Text>
          </Pressable>

          <Text style={[styles.recoveryHint, { color: theme.textMuted }]}>
            Forgot your password? Ask a staff member at your next visit —
            we can reset it for you in-store.
          </Text>
        </View>
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
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 32,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  formError: {
    fontSize: 13,
    color: "#EF4444",
    textAlign: "center",
  },
  submitButton: {
    marginTop: 8,
  },
  switchLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  switchText: {
    fontSize: 14,
  },
  recoveryHint: {
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
