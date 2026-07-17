import React, { forwardRef } from "react";
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";

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
            borderColor: theme.border,
          },
          style,
        ]}
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
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
