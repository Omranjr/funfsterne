import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Sun, Moon, SunMoon } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius } from "@/constants/theme";
import type { ThemeMode } from "@/constants/theme";

export interface ThemeToggleProps {
  size?: number;
  style?: object;
}

const MODE_ICON = {
  system: SunMoon,
  light: Sun,
  dark: Moon,
} as const;

const MODE_LABEL: Record<ThemeMode, string> = {
  system: "common.themeSystem",
  light: "common.themeLight",
  dark: "common.themeDark",
};

export function ThemeToggle({ size = 20, style }: ThemeToggleProps) {
  const { theme, mode, toggle } = useTheme();
  const { t } = useTranslation();

  // The icon shows the mode you are IN, not the one you would move to. With
  // three states an "opposite of current" icon is ambiguous, and the label
  // beside it is what actually makes the state readable.
  const Icon = MODE_ICON[mode];

  return (
    <TouchableOpacity
      onPress={toggle}
      style={[styles.button, { borderColor: theme.hairlineStrong }, style]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t("common.changeAppearance")}
      accessibilityValue={{ text: t(MODE_LABEL[mode]) }}
    >
      <View style={styles.content}>
        <Icon size={size} color={theme.gold} />
        <Text style={[typography.bodySm, { color: theme.textMuted }]}>
          {t(MODE_LABEL[mode])}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
