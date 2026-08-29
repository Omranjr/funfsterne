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
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius } from "@/constants/theme";
import { CachedImage } from "./CachedImage";
import { CardWash } from "./CardWash";
import { StripePlaceholder } from "./StripePlaceholder";
import { formatPrice } from "@/lib/format-price";

export interface ProductCardProps {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
  /** Already-translated category label, rendered as the gold eyebrow. */
  category?: string;
  isAvailable?: boolean;
  isNew?: boolean;
  /** Micro status line beside the price, e.g. "IN STOCK HERE". */
  stockLabel?: string;
  /**
   * "row"  — the 3a featured card: thumbnail left, text column right.
   * "grid" — the tile used by the Shop screen's 2-column grid, where the
   *          image sits on top. Kept so redesigning Home doesn't force a
   *          redesign of Shop, which is out of scope for this pass.
   */
  variant?: "row" | "grid";
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const THUMB_SIZE = 104;

export function ProductCard({
  name,
  description,
  price,
  imageUrl,
  category,
  isNew = false,
  stockLabel,
  variant = "row",
  onPress,
  style,
  imageStyle,
  textStyle,
  testID,
}: ProductCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const isDark = theme.mode === "dark";
  const isGrid = variant === "grid";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, { stiffness: 400, damping: 20 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { stiffness: 400, damping: 20 });
  }, [scale]);

  const accessibilityLabel = [name, category, `€${formatPrice(price)}`]
    .filter(Boolean)
    .join(", ");

  return (
    <AnimatedPressable
      testID={testID}
      entering={FadeIn.duration(300)}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      accessible
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.card,
        isGrid && styles.cardGrid,
        {
          backgroundColor: theme.surface,
          borderColor: theme.hairlineStrong,
        },
        animatedStyle,
        style,
      ]}
    >
      <CardWash />

      {imageUrl ? (
        // The photo sits INSIDE a framed well rather than bleeding to the
        // card edge: product shots are mostly on white packaging, and
        // edge-to-edge they became the card's own background, erasing the
        // hairline frame (and putting a white block on the dark ground).
        <View
          style={[
            isGrid ? styles.thumbGrid : styles.thumb,
            styles.thumbWell,
            { backgroundColor: theme.surface, borderColor: theme.hairline },
          ]}
        >
          <CachedImage
            source={imageUrl}
            style={[styles.thumbImage, imageStyle]}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>
      ) : (
        <StripePlaceholder
          size={12}
          style={isGrid ? styles.thumbGrid : styles.thumb}
        >
          <View style={styles.thumbLabel}>
            <Text
              style={[typography.microXs, { color: theme.textMuted }]}
              allowFontScaling={false}
            >
              {t("products.shotPlaceholder")}
            </Text>
          </View>
        </StripePlaceholder>
      )}

      <View style={[styles.content, isGrid && styles.contentGrid]}>
        {category ? (
          <Text
            style={[typography.microXs, styles.eyebrow, { color: theme.goldText }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {category}
          </Text>
        ) : null}

        {/* In the grid both text blocks reserve their full two lines even
            when they only use one, so a short product and a long one
            produce the same card and their prices line up across the row. */}
        <Text
          numberOfLines={2}
          style={[
            typography.bodyLg,
            isGrid && styles.nameGrid,
            { color: theme.text },
            textStyle,
          ]}
        >
          {name}
        </Text>

        {description || isGrid ? (
          <Text
            numberOfLines={2}
            style={[
              typography.bodySm,
              isGrid && styles.descriptionGrid,
              { color: theme.textMuted },
            ]}
          >
            {description ?? ""}
          </Text>
        ) : null}

        <View style={[styles.priceRow, isGrid && styles.priceRowGrid]}>
          <Text style={[typography.price, { color: theme.goldText }]}>
            €{formatPrice(price)}
          </Text>
          {isNew ? (
            <Text
              style={[typography.microXs, { color: theme.goldText }]}
              numberOfLines={1}
              allowFontScaling={false}
            >
              {t("products.newBadge").toUpperCase()}
            </Text>
          ) : stockLabel ? (
            <Text
              style={[typography.microXs, { color: theme.textMuted }]}
              // Keeps "IN STOCK HERE" on one line so it never wraps under
              // the price and breaks the row's baseline alignment.
              numberOfLines={1}
              allowFontScaling={false}
            >
              {stockLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // Same surface recipe as the coupon and the shared Card: 8dp radius,
  // gold hairline, opaque fill, warm wash.
  card: {
    flexDirection: "row",
    gap: 15,
    padding: 13,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardGrid: {
    flexDirection: "column",
    gap: 10,
    // Keeps the image well inset from the card's hairline instead of
    // butting against it.
    padding: 10,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbGrid: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: borderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  // Product shots are almost all white packaging on white. Without a real
  // inset the photo becomes the card's background and swallows the hairline
  // frame, so the well keeps a visible margin of `theme.surface` on every
  // side and `contain` keeps the whole product inside it rather than
  // cropping it out to the edges.
  thumbWell: {
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  thumbImage: {
    flex: 1,
    width: "100%",
    borderRadius: borderRadius.sm - 2,
  },
  thumbLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  // Fills the card's remaining height so the price row can be pinned to the
  // bottom of it rather than floating under whatever text happened to fit.
  contentGrid: {
    flex: 1,
    justifyContent: "flex-start",
    gap: 4,
  },
  nameGrid: {
    // 2 × typography.bodyLg lineHeight
    minHeight: 40,
  },
  descriptionGrid: {
    // 2 × typography.bodySm lineHeight
    minHeight: 30,
  },
  priceRowGrid: {
    marginTop: "auto",
  },
  eyebrow: {
    // Micro type is always uppercase; translations stay natural-cased in
    // the locale files and get transformed here.
    textTransform: "uppercase",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 11,
    marginTop: 4,
    flexWrap: "nowrap",
  },
});
