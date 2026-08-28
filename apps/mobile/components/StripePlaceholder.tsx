import React, { useId } from "react";
import { View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import Svg, { Defs, Pattern, Rect } from "react-native-svg";
import { useTheme } from "@/contexts/ThemeContext";

export interface StripePlaceholderProps {
  /** Stripe pitch in dp. The design uses 14 for tiles, 12 for card thumbs. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}

/**
 * The 135° two-tone stripe used wherever real product/category photography
 * isn't available yet.
 *
 * Implemented with an SVG <Pattern> because React Native has no
 * `repeating-linear-gradient`; the alternative (stacking N rotated Views)
 * would put dozens of nodes behind every thumbnail in a scrolling list.
 *
 * The pattern id is derived from React's useId so that multiple placeholders
 * on one screen don't collide — SVG ids share a document scope, and a fixed
 * id would make every instance render the first one's colours.
 */
export function StripePlaceholder({
  size = 14,
  style,
  children,
  testID,
}: StripePlaceholderProps) {
  const { theme } = useTheme();
  const patternId = `stripe-${useId().replace(/:/g, "")}`;
  const half = size / 2;

  return (
    <View testID={testID} style={[styles.container, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width={size}
            height={size}
            patternTransform="rotate(135)"
          >
            <Rect x={0} y={0} width={half} height={size} fill={theme.placeholderA} />
            <Rect x={half} y={0} width={half} height={size} fill={theme.placeholderB} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
