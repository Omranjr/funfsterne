import React, { forwardRef } from "react";
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { borderRadius } from "@/constants/theme";
import { CardWash } from "./CardWash";

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
  testID?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const Card = forwardRef<View, CardProps>(
  ({ children, style, animated = true, testID }, ref) => {
    const { theme } = useTheme();
    const Wrapper = animated ? AnimatedView : View;
    const wrapperProps = animated ? { entering: FadeIn.duration(250) } : {};

    return (
      <Wrapper
        ref={ref}
        testID={testID}
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.hairlineStrong,
          },
          style,
        ]}
        {...wrapperProps}
      >
        <CardWash />
        {children}
      </Wrapper>
    );
  }
);

Card.displayName = "Card";

const styles = StyleSheet.create({
  // One card recipe across the whole app, taken from the coupon: the 8dp
  // radius, the gold hairline (not the neutral border), the opaque surface
  // fill, and the warm wash above. Previously this was a 16dp radius with a
  // grey border, which is why loyalty and account panels read as a
  // different family from the coupons and product tiles.
  card: {
    borderRadius: borderRadius.md,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});
