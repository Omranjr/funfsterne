import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, Text, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeContext";
import { useBrandAssets, useConfig } from "../config/ConfigContext";
import { typography } from "../theme/tokens";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { withAlpha } from "../theme/color";

/**
 * A typographic opening. The alternative to `AnimatedSplash`'s photographic
 * one, selected by a brand with `intro: "editorial"`.
 *
 * The composition is deliberately type-led rather than image-led. Two
 * reasons, and the second is the practical one:
 *
 *  1. A barber brand's identity is its wordmark and its restraint. Stock
 *     barber imagery — poles, cartoon scissors, clipart razors — reads as a
 *     template, and a heavy hero photo dates faster than type does.
 *  2. It has to look finished before the customer has supplied a single
 *     asset. The hero image sits behind a scrim deep enough that a flat
 *     placeholder reads as intentional negative space, and a real
 *     photograph, dropped in later, reads as depth. Nothing about the
 *     layout changes between those two states.
 *
 * Sequence (≈2.6s, then it holds until the parent dismisses it):
 *
 *     ground + scrim                        0ms
 *          ↓
 *     monogram rule draws outward           250ms
 *          ↓
 *     monogram letters fade up              600ms
 *          ↓
 *     wordmark rises into place             900ms
 *          ↓
 *     divider expands from the centre      1350ms
 *          ↓
 *     tagline fades in                     1600ms
 *          ↓
 *     progress hairline fills              2000ms  (loops while booting)
 *
 * A single light sweep crosses the composition once, slowly. Under Reduce
 * Motion every stage renders in its final position with no movement and no
 * loop, which is why each stage's opacity and transform are separate shared
 * values rather than one timeline.
 */

export interface EditorialIntroProps {
  onSequenceComplete?: () => void;
  testID?: string;
  /**
   * Ref-like object whose `current()` triggers the fade-out. Same contract
   * as AnimatedSplash so `BrandedIntroGate` can host either.
   */
  dismissRef?: React.MutableRefObject<(() => void) | null>;
}

const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN_OUT = Easing.inOut(Easing.quad);

const RULE_DELAY = 250;
const RULE_DURATION = 900;
const MONOGRAM_DELAY = 600;
const MONOGRAM_DURATION = 700;
const WORDMARK_DELAY = 900;
const WORDMARK_DURATION = 1000;
const DIVIDER_DELAY = 1350;
const DIVIDER_DURATION = 700;
const TAGLINE_DELAY = 1600;
const TAGLINE_DURATION = 800;
const PROGRESS_DELAY = 2000;
const PROGRESS_DURATION = 1600;
const SWEEP_DELAY = 1100;
const SWEEP_DURATION = 2600;
const FADE_OUT_DURATION = 600;

/** How far the progress thumb travels either side of centre. */
const PROGRESS_TRACK = 120;

/** Where the sequence is "played out" — the parent's minimum-timeline cue. */
const SEQUENCE_COMPLETE_AT = 2600;

/**
 * The monogram: the first letter of each of the first two words.
 *
 * Derived from the configured app name rather than stored separately, so a
 * new shop gets a correct monogram from the one value it has to set anyway,
 * with nothing extra to forget.
 *
 * A two-word name gives two letters ("Acme Barbers" -> "AB"). A single-word
 * name gives one, which is a deliberate outcome rather than a gap: one
 * letter inside the diamond reads as a maker's mark, whereas the first two
 * characters of a word ("Ba") reads as a truncation. The `slice(0, 2)`
 * fallback only fires for a name with no letters in it at all.
 */
function monogramFor(appName: string): string {
  const initials = appName
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word[0])
    .filter((char) => /\p{L}/u.test(char))
    .slice(0, 2)
    .join("");
  return initials.toUpperCase() || appName.slice(0, 2).toUpperCase();
}

export function EditorialIntro({
  onSequenceComplete,
  testID,
  dismissRef,
}: EditorialIntroProps) {
  const { theme } = useTheme();
  const assets = useBrandAssets();
  const config = useConfig();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const monogram = useMemo(() => monogramFor(config.appName), [config.appName]);

  const containerOpacity = useSharedValue(1);
  const rule = useSharedValue(0);
  const mono = useSharedValue(0);
  const wordmark = useSharedValue(0);
  const divider = useSharedValue(0);
  const tagline = useSharedValue(0);
  const progress = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      // Final state, immediately. Not a shortened animation — a still
      // composition, which is what Reduce Motion actually asks for.
      rule.value = 1;
      mono.value = 1;
      wordmark.value = 1;
      divider.value = 1;
      tagline.value = 1;
      progress.value = 1;
      onSequenceComplete?.();
      return;
    }

    rule.value = withDelay(
      RULE_DELAY,
      withTiming(1, { duration: RULE_DURATION, easing: EASE_OUT }),
    );
    mono.value = withDelay(
      MONOGRAM_DELAY,
      withTiming(1, { duration: MONOGRAM_DURATION, easing: EASE_OUT }),
    );
    wordmark.value = withDelay(
      WORDMARK_DELAY,
      withTiming(1, { duration: WORDMARK_DURATION, easing: EASE_OUT }),
    );
    divider.value = withDelay(
      DIVIDER_DELAY,
      withTiming(1, { duration: DIVIDER_DURATION, easing: EASE_OUT }),
    );
    tagline.value = withDelay(
      TAGLINE_DELAY,
      withTiming(1, { duration: TAGLINE_DURATION, easing: EASE_OUT }),
    );
    // Loops: this is the boot indicator, and it has to keep moving for as
    // long as the app is still loading rather than finishing and leaving a
    // static bar that reads as "stuck".
    progress.value = withDelay(
      PROGRESS_DELAY,
      withRepeat(
        withTiming(1, { duration: PROGRESS_DURATION, easing: EASE_IN_OUT }),
        -1,
        false,
      ),
    );
    sweep.value = withDelay(
      SWEEP_DELAY,
      withTiming(1, { duration: SWEEP_DURATION, easing: EASE_IN_OUT }),
    );

    const handle = setTimeout(
      () => onSequenceComplete?.(),
      SEQUENCE_COMPLETE_AT,
    );
    return () => clearTimeout(handle);
  }, [
    reduceMotion,
    onSequenceComplete,
    rule,
    mono,
    wordmark,
    divider,
    tagline,
    progress,
    sweep,
  ]);

  useEffect(() => {
    if (!dismissRef) return;
    dismissRef.current = () => {
      containerOpacity.value = withTiming(0, {
        duration: FADE_OUT_DURATION,
        easing: EASE_IN_OUT,
      });
    };
    return () => {
      if (dismissRef) dismissRef.current = null;
    };
  }, [dismissRef, containerOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  // The rule draws outward from the monogram in both directions at once.
  const ruleStyle = useAnimatedStyle(() => ({
    opacity: rule.value,
    transform: [{ scaleX: rule.value }],
  }));

  const monoStyle = useAnimatedStyle(() => ({
    opacity: mono.value,
    transform: [
      { translateY: interpolate(mono.value, [0, 1], [8, 0]) },
      { scale: interpolate(mono.value, [0, 1], [0.94, 1]) },
    ],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmark.value,
    transform: [{ translateY: interpolate(wordmark.value, [0, 1], [22, 0]) }],
  }));

  const dividerStyle = useAnimatedStyle(() => ({
    opacity: divider.value * 0.9,
    transform: [{ scaleX: divider.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: tagline.value,
    transform: [{ translateY: interpolate(tagline.value, [0, 1], [10, 0]) }],
  }));

  // Travels the full track and back out, so the bar never sits at 100%
  // looking finished while the app is still working.
  const progressStyle = useAnimatedStyle(() => ({
    opacity: progress.value > 0 ? 1 : 0,
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-PROGRESS_TRACK, PROGRESS_TRACK]) },
    ],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweep.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: interpolate(sweep.value, [0, 1], [-width * 0.6, width * 1.1]) },
      { rotate: "14deg" },
    ],
  }));

  const tagText = config.appTagline ?? t("home.tagline");

  return (
    <Animated.View
      testID={testID}
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: theme.splashGround },
        containerStyle,
      ]}
      pointerEvents="none"
    >
      {/* Hero image, held well back. With a real photograph this is depth;
          with the placeholder it is texture. Either way the type leads. */}
      <Image
        source={assets.hero}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition={{ top: "28%", left: "50%" }}
        cachePolicy="memory-disk"
        transition={0}
      />

      {/* Scrim. Deep at both ends, lighter across the middle third where the
          wordmark sits, so the type has contrast without the image being
          flattened into a flat block of colour. */}
      <LinearGradient
        colors={[
          theme.photoScrimDeep,
          theme.photoScrimMid,
          withAlpha(theme.splashGround, 0.82),
          theme.photoScrimDeep,
        ]}
        locations={[0, 0.32, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* A single warm wash from the top-left, the same gesture the app's
          ground uses, so the opening and the home screen read as one
          surface rather than two designs. */}
      <LinearGradient
        colors={[theme.groundWarmA, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { height }]}>
        {/* ── Monogram ─────────────────────────────────────────────── */}
        <View style={styles.monogramBlock}>
          <Animated.View
            style={[
              styles.rule,
              { backgroundColor: theme.hairlineStrong },
              ruleStyle,
            ]}
          />
          <Animated.View style={[styles.monogramFrame, monoStyle]}>
            <View
              style={[
                styles.monogramBorder,
                { borderColor: withAlpha(theme.gold, 0.45) },
              ]}
            />
            <Text
              style={[
                styles.monogramText,
                typography.micro,
                { color: theme.goldLight },
              ]}
              allowFontScaling={false}
            >
              {monogram}
            </Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.rule,
              { backgroundColor: theme.hairlineStrong },
              ruleStyle,
            ]}
          />
        </View>

        {/* ── Wordmark ─────────────────────────────────────────────── */}
        <Animated.View style={wordmarkStyle}>
          <Text
            style={[styles.wordmark, { color: theme.onImage }]}
            allowFontScaling={false}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {config.appName}
          </Text>
        </Animated.View>

        {/* ── Divider ──────────────────────────────────────────────── */}
        <View style={styles.dividerRow}>
          <Animated.View
            style={[
              styles.divider,
              { backgroundColor: withAlpha(theme.gold, 0.55) },
              dividerStyle,
            ]}
          />
        </View>

        {/* ── Tagline ──────────────────────────────────────────────── */}
        <Animated.View style={taglineStyle}>
          <Text
            style={[
              typography.micro,
              styles.tagline,
              { color: withAlpha(theme.onImage, 0.72) },
            ]}
            allowFontScaling={false}
          >
            {tagText}
          </Text>
        </Animated.View>
      </View>

      {/* ── Boot indicator ───────────────────────────────────────────
          A hairline rather than a spinner: a spinner on a branded opening
          reads as a loading screen, and this reads as part of the design
          while saying the same thing. */}
      <View style={[styles.progressTrack, { borderTopColor: theme.hairline }]}>
        <Animated.View style={[styles.progressThumbWrap, progressStyle]}>
          <LinearGradient
            colors={["transparent", theme.goldLight, "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.progressThumb}
          />
        </Animated.View>
      </View>

      {/* ── Light sweep ──────────────────────────────────────────────
          Crosses once, slowly, and does not loop. A repeating shine on a
          static composition is the thing that makes an opening feel cheap. */}
      {!reduceMotion ? (
        <Animated.View
          style={[styles.sweep, { height: height * 1.4 }, sweepStyle]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[
              "transparent",
              withAlpha(theme.onImage, 0.05),
              "transparent",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  monogramBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  // Fixed width so the two rules are symmetrical whatever the monogram is.
  rule: {
    width: 54,
    height: StyleSheet.hairlineWidth,
  },
  monogramFrame: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
  // A rotated square rather than a circle: it reads as a maker's mark, and
  // it is the one geometric gesture in the whole composition.
  monogramBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: StyleSheet.hairlineWidth,
    transform: [{ rotate: "45deg" }],
  },
  monogramText: {
    fontSize: 12,
    letterSpacing: 3,
  },
  wordmark: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  dividerRow: {
    height: 1,
    marginTop: 26,
    marginBottom: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    width: 64,
    height: StyleSheet.hairlineWidth,
  },
  tagline: {
    textAlign: "center",
    textTransform: "uppercase",
    fontSize: 9.5,
    letterSpacing: 3.2,
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 84,
    height: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignItems: "center",
  },
  progressThumbWrap: {
    width: 160,
    height: 1,
  },
  progressThumb: {
    flex: 1,
  },
  sweep: {
    position: "absolute",
    top: -80,
    width: 130,
  },
});
