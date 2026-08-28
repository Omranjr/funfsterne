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
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius } from "@/constants/theme";
import { type Branch } from "@funfsterne/shared-types";
import { useReduceMotion } from "@/hooks/useReduceMotion";

export interface HeroBannerProps {
  selectedBranch: Branch | null | undefined;
  branches: Branch[] | undefined;
  onSelectBranch: (branch: Branch | null) => void;
  onOpenBranchPicker: () => void;
  /** Loyalty stamps earned, drives the ring arc. Presentational only. */
  loyaltyPoints?: number;
  /** Points that complete one ring. */
  loyaltyTarget?: number;
  /**
   * Safe-area top inset. The hero is full-bleed to y:0 with the status bar
   * floating over it, so its overlay content has to clear the notch itself.
   */
  topInset?: number;
}

const HERO_HEIGHT = 400;
const SHIMMER_WIDTH = 100;
const SHIMMER_DURATION = 7000;

const RING_SIZE = 42;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function HeroBanner({
  selectedBranch,
  branches,
  onOpenBranchPicker,
  loyaltyPoints = 0,
  loyaltyTarget = 100,
  topInset = 0,
}: HeroBannerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
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

  // Ring arc. Clamped so an over-target balance doesn't wrap the circle.
  const progress = Math.max(0, Math.min(1, loyaltyTarget > 0 ? loyaltyPoints / loyaltyTarget : 0));
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

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

      {/* Loyalty ring, top-right. Sits clear of the portrait's face. */}
      {/* The reference puts the ring 54dp down from the screen edge, which
          already clears a standard status bar. A device with a taller notch
          reports a bigger inset, so that wins when it is larger. */}
      <View
        style={[styles.ring, { top: Math.max(topInset + 12, 54) }]}
        pointerEvents="none"
      >
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={hexToRgba(theme.gold, 0.16)}
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={theme.gold}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            // Start the arc at 12 o'clock rather than 3.
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <View
          style={[
            styles.ringInner,
            { backgroundColor: hexToRgba(theme.ground, 0.9) },
          ]}
        >
          <Text
            style={[typography.priceSm, styles.ringValue, { color: theme.gold }]}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {loyaltyPoints}
          </Text>
        </View>
      </View>

      {/* Bottom block: eyebrow + wordmark + branch chip. */}
      <View style={styles.bottomBlock}>
        <View style={styles.eyebrowRow}>
          <Text
            style={[typography.microXs, { color: theme.goldText }]}
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
  ring: {
    position: "absolute",
    right: 22,
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: {
    textAlign: "center",
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
