import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * The warm sheen that runs off the left edge of every card surface.
 *
 * It started on the coupon card and is now shared by all of them, so a
 * product tile, a loyalty panel and a coupon read as the same object at
 * different sizes rather than three unrelated boxes.
 *
 * Absolutely positioned, so it must be the FIRST child of its card (later
 * children paint over it) and the card needs `overflow: "hidden"` for the
 * wash to respect the corner radius.
 */
export function CardWash() {
  const { theme } = useTheme();

  return (
    <LinearGradient
      pointerEvents="none"
      colors={[theme.groundWarmA, "transparent"]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 0.6, y: 0.5 }}
      style={StyleSheet.absoluteFill}
    />
  );
}
