import React from "react";
import { View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

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
  borderRadius = 8,
  style,
  testID,
}: SkeletonProps) {
  const { theme } = useTheme();
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
        { width: resolvedWidth, height, borderRadius, backgroundColor: theme.muted },
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
      <Skeleton height={160} borderRadius={16} />
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

export interface BranchPillSkeletonProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function BranchPillSkeleton({
  count = 3,
  style,
  testID,
}: BranchPillSkeletonProps) {
  return (
    <View testID={testID} style={[styles.pillRow, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          width={96}
          height={36}
          borderRadius={999}
        />
      ))}
    </View>
  );
}

export interface DiscountCodeSkeletonProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function DiscountCodeSkeleton({
  style,
  testID,
}: DiscountCodeSkeletonProps) {
  return (
    <View testID={testID} style={[styles.codeRow, style]}>
      <View style={styles.codeInfo}>
        <Skeleton width="50%" height={18} />
        <Skeleton width="30%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={64} height={24} borderRadius={999} />
    </View>
  );
}

export interface DiscountCodeListSkeletonProps {
  count?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function DiscountCodeListSkeleton({
  count = 3,
  style,
  testID,
}: DiscountCodeListSkeletonProps) {
  return (
    <View testID={testID} style={[styles.list, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <DiscountCodeSkeleton key={index} />
      ))}
    </View>
  );
}

export interface AccountSkeletonProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function AccountSkeleton({ style, testID }: AccountSkeletonProps) {
  return (
    <View testID={testID} style={[styles.account, style]}>
      <View style={styles.card}>
        <Skeleton width="40%" height={18} />
        <Skeleton width="100%" height={48} />
        <Skeleton width="30%" height={40} />
      </View>
      <View style={styles.card}>
        <Skeleton width="50%" height={18} />
        <BranchPillSkeleton count={4} />
      </View>
      <View style={styles.card}>
        <Skeleton width="50%" height={18} />
        <DiscountCodeListSkeleton count={2} />
      </View>
    </View>
  );
}

export interface ProductDetailSkeletonProps {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ProductDetailSkeleton({
  style,
  testID,
}: ProductDetailSkeletonProps) {
  return (
    <View testID={testID} style={[styles.detail, style]}>
      <Skeleton width="100%" height={280} borderRadius={0} />
      <View style={styles.detailContent}>
        <View style={styles.detailHeader}>
          <Skeleton width="60%" height={28} />
          <Skeleton width={80} height={24} borderRadius={999} />
        </View>
        <Skeleton width="30%" height={22} />
        <Skeleton width="100%" height={14} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="40%" height={18} />
        <View style={styles.branchList}>
          <Skeleton width="100%" height={56} />
          <Skeleton width="100%" height={56} />
          <Skeleton width="100%" height={56} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    // backgroundColor is set dynamically via theme
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  list: {
    gap: 16,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  codeInfo: {
    flex: 1,
    gap: 4,
  },
  account: {
    gap: 24,
  },
  detail: {
    flex: 1,
  },
  detailContent: {
    padding: 16,
    gap: 16,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  branchList: {
    gap: 8,
  },
});
