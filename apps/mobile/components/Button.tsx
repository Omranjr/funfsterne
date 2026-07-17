import React, { useCallback } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";

type ButtonVariant = "primary" | "secondary";

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  hapticOnPress?: boolean;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  style,
  textStyle,
  hapticOnPress = true,
  testID,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const triggerHaptic = useCallback(() => {
    if (variant === "primary" && hapticOnPress && !disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
        // Ignore haptic errors on unsupported devices/simulators
      });
    }
  }, [variant, hapticOnPress, disabled]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { stiffness: 400, damping: 20 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { stiffness: 400, damping: 20 });
  }, [scale]);

  const handlePress = useCallback(() => {
    "worklet";
    runOnJS(triggerHaptic)();
    runOnJS(onPress)();
  }, [onPress, triggerHaptic]);

  const isPrimary = variant === "primary";
  const backgroundColor = disabled
    ? theme.muted
    : isPrimary
      ? theme.gold
      : "transparent";
  const borderColor = disabled ? theme.muted : theme.gold;
  const color = disabled ? theme.textMuted : theme.text;

  return (
    <AnimatedPressable
      testID={testID}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.base,
        {
          backgroundColor,
          borderColor,
          borderWidth: isPrimary ? 0 : StyleSheet.hairlineWidth,
          borderRadius: 12,
        },
        animatedStyle,
        style,
      ]}
    >
      <Text style={[styles.text, { color }, textStyle]}>{title}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 44,
  },
  text: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
