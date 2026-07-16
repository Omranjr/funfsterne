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

export type BadgeVariant = "default" | "primary" | "success" | "danger";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

const variantStyles: Record<
  BadgeVariant,
  { background: string; color: string }
> = {
  default: { background: theme.colors.muted, color: theme.colors.text },
  primary: { background: theme.colors.primary, color: theme.colors.text },
  success: { background: "#22C55E", color: theme.colors.text },
  danger: { background: "#EF4444", color: theme.colors.text },
};

export function Badge({
  label,
  variant = "default",
  style,
  textStyle,
  testID,
}: BadgeProps) {
  const { background, color } = variantStyles[variant];

  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        { backgroundColor: background },
        style,
      ]}
    >
      <Text style={[styles.text, { color }, textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.xl,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
