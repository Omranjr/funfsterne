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
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";
import { Image } from "expo-image";
import { ChevronLeft } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  NameFieldSchema,
  RegisterConsumerUserSchema,
} from "@funfsterne/shared-types";
import { Input } from "./Input";
import { Button } from "./Button";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

export interface SignUpScreenProps {
  onSwitchToLogIn: () => void;
  testID?: string;
}

type Step = 1 | 2;
const TOTAL_STEPS = 2;

export function SignUpScreen({ onSwitchToLogIn, testID }: SignUpScreenProps) {
  const { theme } = useTheme();
  const { register } = useAuth();
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = useCallback(() => {
    const errors: Record<string, string> = {};
    const first = NameFieldSchema.safeParse(firstName);
    const last = NameFieldSchema.safeParse(lastName);
    if (!first.success) errors.firstName = t("auth.signUp.errorFirstName");
    if (!last.success) errors.lastName = t("auth.signUp.errorLastName");

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setStep(2);
  }, [firstName, lastName, t]);

  const handleBack = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
    setStep(1);
  }, []);

  const handleSubmit = useCallback(async () => {
    setFormError(null);

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: t("auth.signUp.errorPasswordMismatch") });
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
  }, [firstName, lastName, username, password, confirmPassword, register, t]);

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
        <View style={styles.topRow}>
          {step === 2 ? (
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel={t("auth.signUp.back")}
              style={[styles.backButton, { backgroundColor: theme.border }]}
            >
              <ChevronLeft size={22} color={theme.text} />
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}

          <View style={styles.dots}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i + 1 === step ? theme.gold : theme.muted,
                    width: i + 1 === step ? 20 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.backButton} />
        </View>

        {step === 1 ? (
          <Animated.View
            key="step1"
            entering={FadeInRight.duration(250)}
            exiting={FadeOutLeft.duration(150)}
            style={styles.stepContent}
          >
            <View style={styles.header}>
              <Image
                source={require("../assets/icon.png")}
                style={styles.logo}
                contentFit="contain"
                cachePolicy="memory"
              />
              <Text style={[styles.title, { color: theme.gold }]}>
                {t("auth.signUp.step1Title")}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                {t("auth.signUp.step1Subtitle")}
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label={t("auth.signUp.firstName")}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="given-name"
                returnKeyType="next"
                error={fieldErrors.firstName}
              />
              <Input
                label={t("auth.signUp.lastName")}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="family-name"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                error={fieldErrors.lastName}
              />

              <Button
                title={t("auth.signUp.continue")}
                onPress={handleContinue}
                style={styles.submitButton}
              />

              <Pressable
                onPress={onSwitchToLogIn}
                style={styles.switchLink}
                accessibilityRole="button"
              >
                <Text style={[styles.switchText, { color: theme.textMuted }]}>
                  {t("auth.signUp.haveAccount")}{" "}
                  <Text style={{ color: theme.gold, fontWeight: "700" }}>
                    {t("auth.signUp.logIn")}
                  </Text>
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            key="step2"
            entering={FadeInRight.duration(250)}
            exiting={FadeOutLeft.duration(150)}
            style={styles.stepContent}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: theme.gold }]}>
                {t("auth.signUp.step2Title")}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                {t("auth.signUp.step2Subtitle")}
              </Text>
            </View>

            <View style={styles.form}>
              <Input
                label={t("auth.signUp.username")}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
                autoComplete="username"
                returnKeyType="next"
                error={fieldErrors.username}
              />

              <Input
                label={t("auth.signUp.password")}
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
                label={t("auth.signUp.confirmPassword")}
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
                title={submitting ? t("auth.signUp.creatingAccount") : t("auth.signUp.createAccount")}
                onPress={handleSubmit}
                disabled={submitting}
                style={styles.submitButton}
              />
            </View>
          </Animated.View>
        )}
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  stepContent: {
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
});
