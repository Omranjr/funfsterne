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
import { RegisterConsumerUserSchema } from "@funfsterne/shared-types";
import { Input } from "./Input";
import { Button } from "./Button";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

export interface SignUpScreenProps {
  onSwitchToLogIn: () => void;
  testID?: string;
}

export function SignUpScreen({ onSwitchToLogIn, testID }: SignUpScreenProps) {
  const { theme } = useTheme();
  const { register } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    setFormError(null);

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Passwords don't match" });
      return;
    }

    const parse = RegisterConsumerUserSchema.safeParse({
      firstName,
      lastName,
      username,
      password,
    });

    if (!parse.success) {
      const errors: Record<string, string> = {};
      for (const issue of parse.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    const result = await register(parse.data);
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.error);
    }
    // On success, AuthContext's isAuthenticated flips true and the root
    // layout's boot sequence advances past this screen on its own.
  }, [firstName, lastName, username, password, confirmPassword, register]);

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
          <Text style={[styles.title, { color: theme.gold }]}>
            Create your account
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Just your name and a login — no email, no phone.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <Input
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              textContentType="givenName"
              autoComplete="given-name"
              returnKeyType="next"
              error={fieldErrors.firstName}
              containerStyle={styles.rowItem}
            />
            <Input
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              textContentType="familyName"
              autoComplete="family-name"
              returnKeyType="next"
              error={fieldErrors.lastName}
              containerStyle={styles.rowItem}
            />
          </View>

          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username-new"
            returnKeyType="next"
            error={fieldErrors.username}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            passwordRules="minlength: 8;"
            returnKeyType="next"
            error={fieldErrors.password}
          />

          <Input
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            error={fieldErrors.confirmPassword}
          />

          {formError ? (
            <Text style={styles.formError}>{formError}</Text>
          ) : null}

          <Button
            title={submitting ? "Creating account…" : "Create account"}
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
          />

          <Pressable
            onPress={onSwitchToLogIn}
            style={styles.switchLink}
            accessibilityRole="button"
          >
            <Text style={[styles.switchText, { color: theme.textMuted }]}>
              Already have an account?{" "}
              <Text style={{ color: theme.gold, fontWeight: "700" }}>
                Log in
              </Text>
            </Text>
          </Pressable>
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowItem: {
    flex: 1,
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
});
