import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  withRepeat,
  interpolate,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Button } from "./Button";
import { useTheme } from "@/contexts/ThemeContext";
import { Image } from "expo-image";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface OnboardingSplashProps {
  onComplete: () => void;
  testID?: string;
}

export function OnboardingSplash({
  onComplete,
  testID,
}: OnboardingSplashProps) {
  const { theme } = useTheme();
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const ringScale = useSharedValue(1);

  const finish = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {
        // ignore
      }
    );
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSequence(
      withTiming(1.1, { duration: 500, easing: Easing.out(Easing.ease) }),
      withSpring(1, { stiffness: 200, damping: 12 })
    );

    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    subtitleOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));
    buttonsOpacity.value = withDelay(1100, withTiming(1, { duration: 500 }));

    ringScale.value = withDelay(
      200,
      withRepeat(
        withTiming(1.4, { duration: 1500, easing: Easing.out(Easing.ease) }),
        -1,
        false
      )
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringScale.value, [1, 1.4], [0.4, 0]),
    transform: [{ scale: ringScale.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [
      {
        translateY: interpolate(titleOpacity.value, [0, 1], [16, 0]),
      },
    ],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [
      {
        translateY: interpolate(subtitleOpacity.value, [0, 1], [16, 0]),
      },
    ],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [
      {
        translateY: interpolate(buttonsOpacity.value, [0, 1], [24, 0]),
      },
    ],
  }));

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        { backgroundColor: theme.background, padding: 24 },
      ]}
    >
      <View style={[styles.logoContainer, { marginBottom: 24 }]}>
        <Animated.View style={[styles.ring, { backgroundColor: theme.gold }, ringStyle]} />
        <Animated.View
          style={[
            styles.logoWrapper,
            { backgroundColor: theme.surface, borderRadius: 999 },
            logoStyle,
          ]}
        >
          <Image
            source={require("../assets/icon.png")}
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory"
            transition={300}
          />
        </Animated.View>
      </View>

      <Animated.Text style={[styles.title, { color: theme.gold }, titleStyle]}>
        Fünf Sterne
      </Animated.Text>
      <Animated.Text style={[styles.subtitle, { color: theme.textMuted }, subtitleStyle]}>
        Premium barber products & exclusive discounts
      </Animated.Text>

      <Animated.View
        style={[
          styles.actions,
          { bottom: 48, left: 24, right: 24, gap: 16 },
          buttonsStyle,
        ]}
      >
        <Button
          title="Get started"
          variant="primary"
          onPress={finish}
          style={styles.button}
        />
        <Pressable onPress={finish}>
          <Text style={[styles.skip, { color: theme.textMuted }]}>Skip intro</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    overflow: "hidden",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    maxWidth: SCREEN_WIDTH * 0.75,
  },
  actions: {
    position: "absolute",
    alignItems: "center",
  },
  button: {
    width: "100%",
  },
  skip: {
    fontSize: 14,
    padding: 8,
  },
});
