import React, { useCallback } from "react";
import {
  Pressable,
  View,
  Text,
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
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "./Badge";
import { CachedImage } from "./CachedImage";

export interface ProductCardProps {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
  category?: string;
  isAvailable?: boolean;
  isNew?: boolean;
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
  isNew = false,
  onPress,
  style,
  imageStyle,
  textStyle,
  testID,
}: ProductCardProps) {
  const { theme } = useTheme();
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
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        animatedStyle,
        style,
      ]}
    >
      <View style={styles.imageWrapper}>
        <CachedImage
          source={imageUrl}
          style={[styles.image, imageStyle]}
          contentFit="cover"
          cachePolicy="memory-disk"
          fallbackText="No image yet"
        />
        {isNew ? (
          <Badge
            label="New"
            variant="primary"
            style={styles.badge}
          />
        ) : null}
      </View>

      <View style={styles.content}>
        <Text numberOfLines={2} style={[styles.name, { color: theme.text }, textStyle]}>
          {name}
        </Text>

        {category ? (
          <Text numberOfLines={1} style={[styles.category, { color: theme.gold }]}>
            {category}
          </Text>
        ) : null}

        {description ? (
          <Text numberOfLines={2} style={[styles.description, { color: theme.textMuted }]}>
            {description}
          </Text>
        ) : null}

        <Text style={[styles.price, { color: theme.gold }]}>
          €{price.toFixed(2)}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  imageWrapper: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  content: {
    padding: 12,
    gap: 4,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 18,
  },
  category: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  price: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    marginTop: 2,
  },
});
