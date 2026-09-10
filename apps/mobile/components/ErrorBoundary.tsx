import { Component, type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";
import { darkTheme } from "@/constants/theme";
import i18n from "@/lib/i18n";

// Read straight off darkTheme rather than through useTheme(): this
// boundary wraps the providers themselves, so it must still render if the
// crash happened inside ThemeProvider. Importing the palette keeps the
// values in constants/theme.ts instead of duplicating hexes here.
const COLORS = {
  background: darkTheme.background,
  text: darkTheme.text,
  textMuted: darkTheme.textMuted,
  gold: darkTheme.gold,
};

/**
 * Translates, but never at the cost of rendering.
 *
 * This boundary is the last thing standing between a crash and a blank
 * screen, and it wraps the providers -- i18n included. So it cannot use the
 * `useTranslation` hook (it is a class, and the provider may be the thing
 * that failed), and it cannot assume i18n initialised at all: before
 * `initI18n` resolves, `t()` hands back the key itself, which would put
 * "common.crashTitle" in front of the customer.
 *
 * Falls back to English rather than showing a key, and swallows anything
 * thrown on the way -- an exception here would replace the error screen with
 * no screen.
 */
function translate(key: string, fallback: string): string {
  try {
    if (!i18n.isInitialized) return fallback;
    const value = i18n.t(key);
    return typeof value === "string" && value !== key ? value : fallback;
  } catch {
    return fallback;
  }
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // No crash-reporting service is wired up yet; log so it at least
    // surfaces in device/EAS build logs rather than vanishing silently.
    console.error("Unhandled error caught by ErrorBoundary:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.container, { backgroundColor: COLORS.background }]}>
          <Text style={[styles.title, { color: COLORS.text }]}>
            {translate("common.crashTitle", "Something went wrong")}
          </Text>
          <Text style={[styles.message, { color: COLORS.textMuted }]}>
            {translate(
              "common.crashMessage",
              "Please try again. If this keeps happening, restart the app.",
            )}
          </Text>
          <Button
            title={translate("common.tryAgain", "Try again")}
            variant="primary"
            onPress={this.handleReset}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  title: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
  },
  message: {
    fontFamily: "Manrope_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
