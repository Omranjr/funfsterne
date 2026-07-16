import React, { useCallback } from "react";
import {
  Pressable,
  View,
  Text,
  Image,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import { theme } from "@/constants/theme";
import { Badge } from "./Badge";

export interface ProductCardProps {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
  category?: string;
  isAvailable?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ProductCard({
  name,
  description,
  price,
  imageUrl,
  category,
  isAvailable = true,
  onPress,
  style,
  imageStyle,
  textStyle,
  testID,
}: ProductCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { stiffness: 400, damping: 20 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { stiffness: 400, damping: 20 });
  }, [scale]);

  return (
    <AnimatedPressable
      testID={testID}
      entering={FadeIn.duration(300)}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[styles.card, animatedStyle, style]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[styles.image, imageStyle]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.placeholder, imageStyle]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={[styles.name, textStyle]}>
            {name}
          </Text>
          <Badge
            label={isAvailable ? "Available" : "Unavailable"}
            variant={isAvailable ? "success" : "danger"}
          />
        </View>

        {category ? <Text style={styles.category}>{category}</Text> : null}

        {description ? (
          <Text numberOfLines={2} style={styles.description}>
            {description}
          </Text>
        ) : null}

        <Text style={styles.price}>€{price.toFixed(2)}</Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.muted,
  },
  image: {
    width: "100%",
    height: 160,
  },
  placeholder: {
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
  },
  category: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  description: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
  },
});
