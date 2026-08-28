import React, { useEffect } from "react";
import { StyleSheet, View, Text, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { typography } from "@/constants/theme";
import { useReduceMotion } from "@/hooks/useReduceMotion";

/**
 * Branded animated intro shown immediately after the native splash.
 *
 * Sequence:
 *   1. Owner portrait fades in, positioned so the face sits high; the
 *      bottom 58% carries a dark scrim so type always reads. That scrim
 *      stays dark in BOTH themes — it sits on photography, not on the
 *      page ground.
 *   2. Gold `FÜNF STERNE` wordmark.
 *   3. Five stars draw in, staggered 200ms: opacity 0→1, scale 0.4→1.15→1,
 *      rotate -40°→0.
 *   4. Those same stars then become the loading indicator — a travelling
 *      wave that loops for as long as the app is booting.
 *   5. Scissors snip in place beneath them.
 *   6. A gold shimmer band sweeps the portrait.
 *
 * Dismissal is driven entirely by the parent's readiness condition via
 * `dismissRef`; nothing here gates on the animation finishing.
 */
export interface AnimatedSplashProps {
  /**
   * Fired once the intro draw-in has played, around the 2.9s mark. The
   * parent uses this as the "minimum timeline elapsed" signal.
   */
  onSequenceComplete?: () => void;
  testID?: string;
  /**
   * Ref-like object whose `current.dismiss()` triggers the reverse-opacity
   * fade-out to reveal the app.
   */
  dismissRef?: React.MutableRefObject<(() => void) | null>;
}

const SOFT_EASE_OUT = Easing.out(Easing.cubic);

const PHOTO_FADE_DURATION = 1400;
const PHOTO_SCALE_DURATION = 3500;
const WORDMARK_START_DELAY = 700;
const WORDMARK_DURATION = 1100;
const FADE_OUT_DURATION = 600;

const STAR_COUNT = 5;
const STAR_IN_DURATION = 500;
const STAR_IN_STAGGER = 200;
const STAR_IN_START = 1400;
const STAR_WAVE_DURATION = 1500;
const STAR_WAVE_STAGGER = 120;

const SNIP_DURATION = 1100;
const SHIMMER_DURATION = 4500;
const SHIMMER_WIDTH = 90;

export function AnimatedSplash({
  onSequenceComplete,
  testID,
  dismissRef,
}: AnimatedSplashProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const photoOpacity = useSharedValue(0);
  const photoScale = useSharedValue(1.12);
  const wordmarkOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);
  const shimmerX = useSharedValue(-SHIMMER_WIDTH);
  const snip = useSharedValue(0);

  // One driver per star: `intro` handles the draw-in, `wave` the loop.
  const starIntro = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];
  const starWave = [
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
    useSharedValue(0),
  ];

  useEffect(() => {
    if (reduceMotion) {
      // Show the finished frame rather than any motion.
      photoOpacity.value = 1;
      photoScale.value = 1;
      wordmarkOpacity.value = 1;
      starIntro.forEach((s) => (s.value = 1));
      const handle = setTimeout(() => onSequenceComplete?.(), 400);
      return () => clearTimeout(handle);
    }

    photoOpacity.value = withTiming(1, {
      duration: PHOTO_FADE_DURATION,
      easing: SOFT_EASE_OUT,
    });
    photoScale.value = withTiming(1, {
      duration: PHOTO_SCALE_DURATION,
      easing: SOFT_EASE_OUT,
    });
    wordmarkOpacity.value = withDelay(
      WORDMARK_START_DELAY,
      withTiming(1, { duration: WORDMARK_DURATION, easing: SOFT_EASE_OUT }),
    );

    starIntro.forEach((star, i) => {
      star.value = withDelay(
        STAR_IN_START + i * STAR_IN_STAGGER,
        withTiming(1, { duration: STAR_IN_DURATION, easing: SOFT_EASE_OUT }),
      );
    });

    // The wave starts only after the last star has finished drawing in, so
    // the two phases read as one continuous idea rather than overlapping.
    const waveStart = STAR_IN_START + (STAR_COUNT - 1) * STAR_IN_STAGGER + STAR_IN_DURATION;
    starWave.forEach((star, i) => {
      star.value = withDelay(
        waveStart + i * STAR_WAVE_STAGGER,
        withRepeat(
          withTiming(1, { duration: STAR_WAVE_DURATION, easing: Easing.inOut(Easing.ease) }),
          -1,
          false,
        ),
      );
    });

    snip.value = withDelay(
      waveStart,
      withRepeat(
        withSequence(
          withTiming(1, { duration: SNIP_DURATION / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: SNIP_DURATION / 2, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );

    shimmerX.value = withRepeat(
      withTiming(width + SHIMMER_WIDTH, {
        duration: SHIMMER_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    );

    const notify = () => onSequenceComplete?.();
    const handle = setTimeout(() => runOnJS(notify)(), waveStart);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, width]);

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
  }));
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const topBladeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(snip.value, [0, 1], [-18, -2])}deg` }],
  }));
  const bottomBladeStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(snip.value, [0, 1], [18, 2])}deg` }],
  }));

  return (
    <Animated.View
      testID={testID}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: theme.splashGround },
        containerStyle,
      ]}
      pointerEvents="none"
    >
      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image
          source={require("../assets/splash-owner.png")}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={{ top: "18%", left: "50%" }}
          cachePolicy="memory-disk"
          transition={0}
        />
      </Animated.View>

      {/* Deliberately hardcoded blacks: this scrim sits on the portrait in
          both themes, so it must not follow the theme's ground colour or
          the gold type would sit on cream in light mode and vanish. */}
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", theme.photoScrimMid, theme.photoScrimDeep]}
        locations={[0, 0.42, 1]}
        style={styles.scrim}
      />

      {!reduceMotion ? (
        <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
          <LinearGradient
            colors={["transparent", theme.hairlineStrong, "transparent"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}

      <View style={styles.textBlock} pointerEvents="none">
        <Animated.Text
          style={[styles.wordmark, { color: theme.goldLight }, wordmarkStyle]}
          allowFontScaling={false}
        >
          FÜNF STERNE
        </Animated.Text>

        <View style={styles.stars}>
          {Array.from({ length: STAR_COUNT }).map((_, i) => (
            <Star
              key={i}
              intro={starIntro[i]}
              wave={starWave[i]}
              color={theme.gold}
              reduceMotion={reduceMotion}
            />
          ))}
        </View>

        {/* Scissors: two blades pivoting from their left ends, plus the
            two ring handles. */}
        <View style={styles.scissors}>
          <Animated.View
            style={[styles.blade, styles.bladeTop, { backgroundColor: theme.gold }, topBladeStyle]}
          />
          <Animated.View
            style={[
              styles.blade,
              styles.bladeBottom,
              { backgroundColor: theme.gold },
              bottomBladeStyle,
            ]}
          />
          <View style={[styles.handle, styles.handleTop, { borderColor: theme.gold }]} />
          <View style={[styles.handle, styles.handleBottom, { borderColor: theme.gold }]} />
        </View>

        <Text
          style={[typography.microXs, styles.loading, { color: theme.textMuted }]}
          allowFontScaling={false}
        >
          {t("common.loading")}
        </Text>
      </View>
    </Animated.View>
  );
}

function Star({
  intro,
  wave,
  color,
  reduceMotion,
}: {
  intro: { value: number };
  wave: { value: number };
  color: string;
  reduceMotion: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const introProgress = intro.value;

    // Draw-in: fade + overshoot scale + unwind the rotation.
    const introOpacity = introProgress;
    const introScale = interpolate(introProgress, [0, 0.7, 1], [0.4, 1.15, 1]);
    const introRotate = interpolate(introProgress, [0, 1], [-40, 0]);

    if (reduceMotion) {
      return { opacity: 1, transform: [{ scale: 1 }, { rotate: "0deg" }] };
    }

    // Wave: only takes over once the draw-in has completed, so the two
    // never fight over the same properties.
    const w = wave.value;
    const waveOpacity = interpolate(w, [0, 0.25, 0.6, 1], [0.28, 1, 0.6, 0.28]);
    const waveScale = interpolate(w, [0, 0.25, 0.6, 1], [0.86, 1.2, 1, 0.86]);
    const waveLift = interpolate(w, [0, 0.25, 0.6, 1], [0, -3, 0, 0]);

    const waveActive = introProgress >= 1 && w > 0;

    return {
      opacity: waveActive ? waveOpacity : introOpacity,
      transform: [
        { scale: waveActive ? waveScale : introScale },
        { rotate: `${waveActive ? 0 : introRotate}deg` },
        { translateY: waveActive ? waveLift : 0 },
      ],
    };
  });

  return (
    <Animated.Text style={[styles.star, { color }, style]} allowFontScaling={false}>
      ★
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: {},
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SHIMMER_WIDTH,
  },
  textBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 54,
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  wordmark: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 26,
    letterSpacing: 4.7,
    textAlign: "center",
  },
  stars: {
    flexDirection: "row",
    gap: 10,
  },
  star: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 15,
  },
  scissors: {
    width: 34,
    height: 34,
    marginTop: 6,
  },
  blade: {
    position: "absolute",
    left: 0,
    width: 34,
    height: 2,
    borderRadius: 2,
  },
  bladeTop: {
    top: 15,
    transformOrigin: "0% 50%",
  },
  bladeBottom: {
    top: 17,
    transformOrigin: "0% 50%",
  },
  handle: {
    position: "absolute",
    left: -9,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    opacity: 0.8,
  },
  handleTop: {
    top: 6,
  },
  handleBottom: {
    top: 20,
  },
  loading: {
    textTransform: "uppercase",
  },
});
