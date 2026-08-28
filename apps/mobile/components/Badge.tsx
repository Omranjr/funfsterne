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

export type BadgeVariant = "default" | "primary" | "success" | "danger";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function Badge({
  label,
  variant = "default",
  style,
  textStyle,
  testID,
}: BadgeProps) {
  const { theme } = useTheme();

  const variantStyles: Record<
    BadgeVariant,
    { background: string; color: string }
  > = {
    default: { background: theme.muted, color: theme.text },
    primary: { background: theme.gold, color: theme.onGold },
    success: { background: theme.success, color: theme.onStatus },
    danger: { background: theme.dangerSurface, color: theme.onStatus },
  };

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
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  text: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 11,
  },
});
