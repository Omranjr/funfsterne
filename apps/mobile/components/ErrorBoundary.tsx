import { Component, type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Button } from "./Button";

// Hardcoded rather than pulled from ThemeContext: this boundary wraps the
// providers themselves, so it must render correctly even if the crash
// happened inside ThemeProvider.
const COLORS = {
  background: "#0D0D0C",
  text: "#F5F0E6",
  textMuted: "#A8A29A",
  gold: "#C9A84C",
};

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
            Something went wrong
          </Text>
          <Text style={[styles.message, { color: COLORS.textMuted }]}>
            Please try again. If this keeps happening, restart the app.
          </Text>
          <Button title="Try again" variant="primary" onPress={this.handleReset} />
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
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
  },
});
