import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useArabicTextStyle } from "@/hooks/useArabicText";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius } from "@/constants/theme";
import { type Branch } from "@funfsterne/shared-types";
import { useReduceMotion } from "@/hooks/useReduceMotion";

export interface HeroBannerProps {
  selectedBranch: Branch | null | undefined;
  branches: Branch[] | undefined;
  onSelectBranch: (branch: Branch | null) => void;
  onOpenBranchPicker: () => void;
  // Loyalty progress used to live here as a ring in the top-right corner. It
  // moved to RewardProgress on the sheet below: over a portrait it was a
  // contrast gamble, it could not be tapped, and a bare number with no unit
  // or goal said nothing. See components/RewardProgress.tsx.
}

const HERO_HEIGHT = 400;
const SHIMMER_WIDTH = 100;
const SHIMMER_DURATION = 7000;


export function HeroBanner({
  selectedBranch,
  branches,
  onOpenBranchPicker,
}: HeroBannerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const arabicText = useArabicTextStyle();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const hasBranches = (branches?.length ?? 0) > 0;
  const isDark = theme.mode === "dark";

  // ── Slow gold shimmer sweeping the portrait ──────────────────────────
  const shimmerX = useSharedValue(-SHIMMER_WIDTH);

  useEffect(() => {
    if (reduceMotion) {
      shimmerX.value = -SHIMMER_WIDTH;
      return;
    }
    shimmerX.value = -SHIMMER_WIDTH;
    shimmerX.value = withRepeat(
      withTiming(width + SHIMMER_WIDTH, {
        duration: SHIMMER_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    );
  }, [reduceMotion, shimmerX, width]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <View style={[styles.container, { height: HERO_HEIGHT, backgroundColor: theme.ground }]}>
      {/* Portrait, shifted up so the face sits in the upper third
          (the reference's object-position: 50% 22%). */}
      <Image
        source={require("../assets/splash-owner.png")}
        style={styles.photo}
        contentFit="cover"
        contentPosition={{ top: "22%", left: "50%" }}
        cachePolicy="memory-disk"
        transition={0}
      />

      {/* Ground-coloured fade that blends the photo into the sheet below.
          The two themes need different curves: on the dark ground the veil
          reads as cinematic shading, but the same stops in light mode lay a
          cream film over the whole portrait and desaturate it to grey — so
          light starts fully transparent and only blends over the bottom
          third, keeping the photo's real colour. */}
      <LinearGradient
        pointerEvents="none"
        colors={
          isDark
            ? [
                hexToRgba(theme.ground, 0.18),
                hexToRgba(theme.ground, 0.5),
                theme.ground,
              ]
            : ["transparent", hexToRgba(theme.ground, 0.35), theme.ground]
        }
        locations={isDark ? [0, 0.48, 0.94] : [0, 0.66, 0.97]}
        style={StyleSheet.absoluteFill}
      />

      {!reduceMotion ? (
        <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
          <LinearGradient
            colors={["transparent", hexToRgba(theme.gold, 0.1), "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}


      {/* Bottom block: eyebrow + wordmark + branch chip. */}
      <View style={styles.bottomBlock}>
        <View style={styles.eyebrowRow}>
          <Text
            style={[typography.microXs, arabicText, { color: theme.goldText }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {t("home.heroEyebrow")}
          </Text>
          <LinearGradient
            colors={[hexToRgba(theme.gold, 0.5), hexToRgba(theme.gold, 0)]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.eyebrowRule}
          />
        </View>

        <View style={styles.wordmarkRow}>
          <View style={styles.wordmarkBlock}>
            <Text
              style={[typography.displayXl, { color: theme.text }]}
              allowFontScaling={false}
            >
              Fünf
            </Text>
            <Text
              style={[typography.displayXlItalic, { color: theme.gold }]}
              allowFontScaling={false}
            >
              Sterne
            </Text>
          </View>

          {hasBranches ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onOpenBranchPicker}
              accessibilityRole="button"
              accessibilityLabel={t("home.selectBranch")}
              style={styles.chipWrapper}
            >
              <BlurView
                intensity={24}
                tint={isDark ? "dark" : "light"}
                style={styles.chipBlur}
              >
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.scrim,
                      borderColor: theme.hairlineStrong,
                    },
                  ]}
                >
                  <View style={[styles.chipDot, { backgroundColor: theme.gold }]} />
                  <Text
                    style={[typography.micro, styles.chipLabel, { color: theme.text }]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    {selectedBranch ? selectedBranch.name : t("home.selectBranch")}
                  </Text>
                  <Text
                    style={[styles.chipChevron, { color: theme.gold }]}
                    allowFontScaling={false}
                  >
                    ›
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.chip,
                styles.chipStatic,
                { backgroundColor: theme.scrim, borderColor: theme.hairline },
              ]}
            >
              <Text
                style={[typography.micro, { color: theme.textMuted }]}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {t("home.noBranchesAvailable")}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/**
 * Blends a theme colour to a given alpha.
 *
 * Theme colours arrive as either `#RRGGBB` or an already-alpha'd
 * `rgba(...)` string, so this handles both rather than assuming hex —
 * passing an rgba value through `${color}${alphaHex}` would silently
 * produce an invalid colour that renders black on Android.
 */
function hexToRgba(color: string, alpha: number): string {
  if (color.startsWith("rgba") || color.startsWith("rgb")) {
    const nums = color.match(/[\d.]+/g);
    if (!nums || nums.length < 3) return color;
    return `rgba(${nums[0]},${nums[1]},${nums[2]},${alpha})`;
  }
  const hex = color.replace("#", "");
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SHIMMER_WIDTH,
  },
  bottomBlock: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 72,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  eyebrowRule: {
    flex: 1,
    height: 1,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
  },
  wordmarkBlock: {
    flexShrink: 1,
  },
  chipWrapper: {
    marginBottom: 5,
    borderRadius: borderRadius.pill,
    overflow: "hidden",
  },
  chipBlur: {
    borderRadius: borderRadius.pill,
    overflow: "hidden",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 190,
  },
  chipStatic: {
    marginBottom: 5,
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  chipLabel: {
    flexShrink: 1,
  },
  chipChevron: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 13,
  },
});
