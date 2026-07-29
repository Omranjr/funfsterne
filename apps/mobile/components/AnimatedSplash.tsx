import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Branded animated intro screen shown immediately after the native splash.
 *
 * Sequence (single continuous piece of motion, no separate pop-ins):
 *   t=0     photo fades 0 -> 1 (1.4s, ease-out) AND
 *           photo scales 1.12 -> 1.0 (3.5s, ease-out — the slow
 *           deceleration reads as a subtle "breathing" zoom even while
 *           the text is appearing)
 *   t=0.7s  wordmark "FÜNFSTERNE" begins:
 *             opacity 0 -> 1, letter-spacing 10px -> 2px (1.4s,
 *             ease-out with slight overshoot via cubic-bezier(0.16,1,0.3,1))
 *   t=2.1s  subtitle "FRISEUR" fades in (0.8s, ease-out)
 *   t=2.9s  subtitle settles
 *
 * The parent (app/_layout.tsx) decides when to start the fade-out based
 * on initial data being ready and the min/max wait caps. We expose a
 * ref-style API via the `dismiss` ref returned by `useAnimatedSplashRef`
 * so the parent can trigger the fade from anywhere in its render tree
 * without re-rendering the splash.
 */
export interface AnimatedSplashProps {
  /**
   * Fired once the visible content sequence (photo + wordmark + subtitle)
   * has completed, around the 2.9s mark. The parent uses this as the
   * "minimum timeline elapsed" signal.
   */
  onSequenceComplete?: () => void;
  testID?: string;
  /**
   * Ref-like object whose `current.dismiss()` triggers the reverse-opacity
   * fade-out to reveal the home screen. The parent calls this once data
   * is ready AND the minimum timeline has elapsed (and at most at the
   * max-wait cap).
   */
  dismissRef?: React.MutableRefObject<(() => void) | null>;
}

// Cubic-bezier(0.16, 1, 0.3, 1) — the "ease-out with slight overshoot"
// curve that gives the letter-tracking its drawn-together feel.
const TRACKING_EASE = Easing.bezier(0.16, 1, 0.3, 1);
// A gentler ease-out for the photo fade and subtitle.
const SOFT_EASE_OUT = Easing.out(Easing.cubic);

const PHOTO_FADE_DURATION = 1400;
const PHOTO_SCALE_DURATION = 3500;
const WORDMARK_START_DELAY = 700;
const WORDMARK_DURATION = 1400; // ends at 2.1s mark, matching the spec
const SUBTITLE_DURATION = 800;
const FADE_OUT_DURATION = 600;

const WORDMARK_START_LETTER_SPACING = 10;
const WORDMARK_END_LETTER_SPACING = 2;
const GOLD = "#D4B660";

export function AnimatedSplash({
  onSequenceComplete,
  testID,
  dismissRef,
}: AnimatedSplashProps) {
  // Photo: fade-in + slow continuous scale.
  const photoOpacity = useSharedValue(0);
  const photoScale = useSharedValue(1.12);

  // Wordmark: opacity + letter-spacing simultaneously.
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTracking = useSharedValue(WORDMARK_START_LETTER_SPACING);

  // Subtitle: opacity only.
  const subtitleOpacity = useSharedValue(0);

  // Container fade-out (the reverse-opacity handoff to the home screen).
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    photoOpacity.value = withTiming(1, {
      duration: PHOTO_FADE_DURATION,
      easing: SOFT_EASE_OUT,
    });
    // Slow ease-out so the deceleration reads as breathing, not freezing.
    photoScale.value = withTiming(1.0, {
      duration: PHOTO_SCALE_DURATION,
      easing: SOFT_EASE_OUT,
    });

    wordmarkOpacity.value = withDelay(
      WORDMARK_START_DELAY,
      withTiming(1, {
        duration: WORDMARK_DURATION,
        easing: TRACKING_EASE,
      }),
    );
    wordmarkTracking.value = withDelay(
      WORDMARK_START_DELAY,
      withTiming(WORDMARK_END_LETTER_SPACING, {
        duration: WORDMARK_DURATION,
        easing: TRACKING_EASE,
      }),
    );

    const subtitleStart = WORDMARK_START_DELAY + WORDMARK_DURATION; // 2.1s
    subtitleOpacity.value = withDelay(
      subtitleStart,
      withTiming(1, {
        duration: SUBTITLE_DURATION,
        easing: SOFT_EASE_OUT,
      }),
    );

    // Notify the parent once the visible content sequence (photo +
    // wordmark + subtitle) has fully played — at the 2.9s mark. The
    // parent uses this as the "minimum timeline elapsed" signal.
    const notify = () => onSequenceComplete?.();
    const sequenceDone = subtitleStart + SUBTITLE_DURATION;
    const handle = setTimeout(() => {
      runOnJS(notify)();
    }, sequenceDone);

    return () => {
      clearTimeout(handle);
    };
  }, [onSequenceComplete, photoOpacity, photoScale, wordmarkOpacity, wordmarkTracking, subtitleOpacity]);

  // Expose an imperative dismiss() so the parent can trigger the fade
  // once data is ready and the min wait has elapsed.
  useEffect(() => {
    if (!dismissRef) return;
    dismissRef.current = () => {
      containerOpacity.value = withTiming(0, {
        duration: FADE_OUT_DURATION,
        easing: SOFT_EASE_OUT,
      });
    };
    return () => {
      if (dismissRef) dismissRef.current = null;
    };
  }, [dismissRef, containerOpacity]);

  const photoStyle = useAnimatedStyle(() => ({
    opacity: photoOpacity.value,
    transform: [{ scale: photoScale.value }],
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    letterSpacing: wordmarkTracking.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      testID={testID}
      style={[StyleSheet.absoluteFill, styles.container, containerStyle]}
      pointerEvents="none"
    >
      {/* Layer 1: full-bleed owner photo, edge to edge, true-to-color.
          No overlay across the top/face area. */}
      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image
          source={require("../assets/splash-owner.png")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
        />
      </Animated.View>

      {/* Layer 2: bottom-only gradient scrim so the wordmark stays
          legible without darkening the owner's face higher up. */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.92)"]}
        locations={[0, 1]}
        style={styles.scrim}
      />

      {/* Layer 3: wordmark + subtitle, anchored near the bottom. */}
      <View style={styles.textBlock} pointerEvents="none">
        <Animated.Text
          style={[styles.wordmark, wordmarkStyle]}
          allowFontScaling={false}
        >
          FÜNFSTERNE
        </Animated.Text>
        <Animated.Text
          style={[styles.subtitle, subtitleStyle]}
          allowFontScaling={false}
        >
          FRISEUR
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0A0A0A",
  },
  // Bottom 38% of the screen — transparent at the top of the scrim,
  // fading to ~92% opacity black at the very bottom.
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "38%",
  },
  textBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 56,
    alignItems: "center",
  },
  wordmark: {
    color: GOLD,
    fontSize: 22,
    fontWeight: "500",
    textAlign: "center",
  },
  subtitle: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 4,
    textAlign: "center",
    marginTop: 6,
    opacity: 0.85,
  },
});
