import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Sun, Moon } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";

export interface ThemeToggleProps {
  size?: number;
  style?: object;
}

export function ThemeToggle({ size = 20, style }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme.mode === "dark";

  return (
    <TouchableOpacity
      onPress={toggle}
      style={[
        styles.button,
        { backgroundColor: theme.border },
        style,
      ]}
      activeOpacity={0.7}
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
      accessibilityRole="button"
    >
      {isDark ? (
        <Sun size={size} color={theme.gold} />
      ) : (
        <Moon size={size} color={theme.gold} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
