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
} from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

export interface BranchPillProps {
  name: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BranchPill({
  name,
  selected = false,
  onPress,
  style,
  textStyle,
  testID,
}: BranchPillProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.94, { stiffness: 400, damping: 20 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { stiffness: 400, damping: 20 });
  }, [scale]);

  const backgroundColor = selected ? theme.gold : theme.surface;
  const color = selected ? theme.background : theme.textMuted;
  const borderColor = selected ? theme.gold : theme.border;

  return (
    <AnimatedPressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        styles.pill,
        { backgroundColor, borderColor },
        animatedStyle,
        style,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          { color, fontFamily: selected ? "Inter_600SemiBold" : "Inter_500Medium" },
          textStyle,
        ]}
      >
        {name}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 14,
  },
});
