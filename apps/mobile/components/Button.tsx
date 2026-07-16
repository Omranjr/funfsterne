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
import { theme } from "@/constants/theme";

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
    ? theme.colors.muted
    : isPrimary
      ? theme.colors.primary
      : "transparent";
  const borderColor = disabled ? theme.colors.muted : theme.colors.primary;
  const color = disabled ? theme.colors.textMuted : theme.colors.text;

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
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    minHeight: 48,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
