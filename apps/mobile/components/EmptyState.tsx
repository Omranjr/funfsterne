import React from "react";
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./Button";

export interface EmptyStateProps {
  title: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  messageStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function EmptyState({
  title,
  message,
  actionTitle,
  onAction,
  style,
  titleStyle,
  messageStyle,
  testID,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View testID={testID} style={[styles.container, style]}>
      <Text style={[styles.title, { color: theme.text }, titleStyle]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, { color: theme.textMuted }, messageStyle]}>{message}</Text>
      ) : null}
      {actionTitle && onAction ? (
        <View style={styles.action}>
          <Button title={actionTitle} onPress={onAction} variant="primary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    textAlign: "center",
  },
  message: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  action: {
    marginTop: 8,
    minWidth: 160,
  },
});
