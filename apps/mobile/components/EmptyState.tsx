import React from "react";
import {
  View,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { theme } from "@/constants/theme";
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
  return (
    <View testID={testID} style={[styles.container, style]}>
      <Text style={[styles.title, titleStyle]}>{title}</Text>
      {message ? (
        <Text style={[styles.message, messageStyle]}>{message}</Text>
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
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: "center",
  },
  action: {
    marginTop: theme.spacing.md,
    minWidth: 160,
  },
});
