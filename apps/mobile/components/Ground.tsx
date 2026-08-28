import React, { useId, useState } from "react";
import {
  View,
  StyleSheet,
  type LayoutChangeEvent,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import Svg, {
  Defs,
  Pattern,
  RadialGradient,
  Rect,
  Line,
  Stop,
} from "react-native-svg";
import { useTheme } from "@/contexts/ThemeContext";

export interface GroundProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Whether the ground fills its parent. True for a screen root; false when
   * it is a block inside a scroll view (the Home sheet) that must size to
   * its own content instead of collapsing.
   */
  fill?: boolean;
  /** Hide the secondary wash where a screen only needs the top-left light. */
  showWashB?: boolean;
  /** Hide the grain on surfaces that already sit on a card. */
  showGrain?: boolean;
  testID?: string;
}

/**
 * Splits an `rgba(r,g,b,a)` token into an opaque colour and its alpha.
 *
 * react-native-svg's `stopColor` ignores the alpha channel of an rgba
 * string — the alpha has to travel separately as `stopOpacity`, or the stop
 * paints fully opaque. (Passing the token straight through is what turned
 * the warm washes into solid gold slabs on device.)
 */
function splitAlpha(color: string): { rgb: string; alpha: number } {
  const nums = color.match(/[\d.]+/g);
  if (!color.startsWith("rgba") || !nums || nums.length < 4) {
    return { rgb: color, alpha: 1 };
  }
  return {
    rgb: `rgb(${nums[0]},${nums[1]},${nums[2]})`,
    alpha: Number(nums[3]),
  };
}

/**
 * The warm layered background every themed screen sits on.
 *
 * Four stacked layers rather than a flat fill:
 *   1. base    — theme.ground
 *   2. wash A  — an ellipse of warm light anchored top-left, 120% × 60%
 *   3. wash B  — a second, dimmer ellipse entering mid-right, 90% × 50%
 *   4. grain   — a fine 52° diagonal hatch at very low opacity
 *
 * Layers 2–4 are one SVG. The washes are true `<RadialGradient>` ellipses
 * matching the reference's `radial-gradient(120% 60% at 20% 0%, …)`. An
 * earlier pass approximated them with LinearGradients, which is what made
 * the ground read as a single flat brown: a linear ramp has no falloff, so
 * two of them overlap into one uniform tint instead of two pools of light.
 *
 * The gradients are sized in `userSpaceOnUse` against the measured box
 * rather than in percentages. Percentage radii resolve against the SVG
 * viewport, not the rect being filled, which on device put a hard-edged
 * seam partway across every screen.
 *
 * The grain is an SVG `<Pattern>` rather than a raster asset: it stays
 * vector-crisp at any density, tints straight from `theme.grain` (so it
 * inverts correctly between themes), and avoids shipping a binary that
 * would need regenerating whenever the tint changes.
 */
export function Ground({
  children,
  style,
  fill = true,
  showWashB = true,
  showGrain = true,
  testID,
}: GroundProps) {
  const { theme } = useTheme();
  // useId() returns ':r1:'-style values; SVG ids must not contain colons.
  const uid = useId().replace(/:/g, "");
  const washAId = `washA-${uid}`;
  const washBId = `washB-${uid}`;
  const grainId = `grain-${uid}`;

  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.w === width && prev.h === height ? prev : { w: width, h: height },
    );
  };

  const washA = splitAlpha(theme.groundWarmA);
  const washB = splitAlpha(theme.groundWarmB);
  const grain = splitAlpha(theme.grain);

  return (
    <View
      testID={testID}
      onLayout={handleLayout}
      style={[fill && styles.fill, { backgroundColor: theme.ground }, style]}
    >
      {size && size.w > 0 && size.h > 0 ? (
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={size.w}
          height={size.h}
        >
          <Defs>
            {/* radial-gradient(120% 60% at 20% 0%, warmA, transparent 60%) */}
            <RadialGradient
              id={washAId}
              gradientUnits="userSpaceOnUse"
              cx={size.w * 0.2}
              cy={0}
              rx={size.w * 1.2}
              ry={size.h * 0.6}
            >
              <Stop offset="0" stopColor={washA.rgb} stopOpacity={washA.alpha} />
              <Stop offset="0.6" stopColor={washA.rgb} stopOpacity={0} />
            </RadialGradient>

            {/* radial-gradient(90% 50% at 90% 40%, warmB, transparent 60%) */}
            <RadialGradient
              id={washBId}
              gradientUnits="userSpaceOnUse"
              cx={size.w * 0.9}
              cy={size.h * 0.4}
              rx={size.w * 0.9}
              ry={size.h * 0.5}
            >
              <Stop offset="0" stopColor={washB.rgb} stopOpacity={washB.alpha} />
              <Stop offset="0.6" stopColor={washB.rgb} stopOpacity={0} />
            </RadialGradient>

            <Pattern
              id={grainId}
              patternUnits="userSpaceOnUse"
              width={5}
              height={5}
              patternTransform="rotate(52)"
            >
              {/* Same alpha caveat as the gradient stops: `stroke` drops
                  an rgba string's alpha, so it travels as strokeOpacity. */}
              <Line
                x1={0}
                y1={0}
                x2={0}
                y2={5}
                stroke={grain.rgb}
                strokeOpacity={grain.alpha}
                strokeWidth={2}
              />
            </Pattern>
          </Defs>

          <Rect width={size.w} height={size.h} fill={`url(#${washAId})`} />
          {showWashB ? (
            <Rect width={size.w} height={size.h} fill={`url(#${washBId})`} />
          ) : null}
          {showGrain ? (
            <Rect width={size.w} height={size.h} fill={`url(#${grainId})`} />
          ) : null}
        </Svg>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
