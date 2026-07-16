import React from "react";
import { View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { theme } from "@/constants/theme";

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = theme.borderRadius.md,
  style,
  testID,
}: SkeletonProps) {
  const shimmer = useSharedValue(0);

  shimmer.value = withRepeat(
    withTiming(1, { duration: 1200 }),
    -1,
    true
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.6, 1]),
  }));

  const resolvedWidth = typeof width === "number" ? width : "100%";

  return (
    <AnimatedView
      testID={testID}
      style={[
        styles.skeleton,
        { width: resolvedWidth, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

export interface ProductCardSkeletonProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ProductCardSkeleton({
  style,
  testID,
}: ProductCardSkeletonProps) {
  return (
    <View testID={testID} style={[styles.card, style]}>
      <Skeleton height={160} borderRadius={theme.borderRadius.lg} />
      <View style={styles.content}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="40%" height={14} />
        <Skeleton width="50%" height={14} />
        <Skeleton width="30%" height={18} />
      </View>
    </View>
  );
}

export interface ListSkeletonProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ListSkeleton({
  count = 4,
  style,
  testID,
}: ListSkeletonProps) {
  return (
    <View testID={testID} style={[styles.list, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.muted,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.muted,
    gap: theme.spacing.sm,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.md,
  },
});
