import React, { forwardRef } from "react";
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { theme } from "@/constants/theme";

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
  testID?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const Card = forwardRef<View, CardProps>(
  ({ children, style, animated = true, testID }, ref) => {
    const Wrapper = animated ? AnimatedView : View;
    const wrapperProps = animated ? { entering: FadeIn.duration(250) } : {};

    return (
      <Wrapper
        ref={ref}
        testID={testID}
        style={[styles.card, style]}
        {...wrapperProps}
      >
        {children}
      </Wrapper>
    );
  }
);

Card.displayName = "Card";

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.muted,
  },
});
