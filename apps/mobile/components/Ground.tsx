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
  Stop,
} from "react-native-svg";
import { useTheme } from "@/contexts/ThemeContext";

/** Grain geometry: a 2dp stripe every 5dp, tilted 52°, per the reference. */
const GRAIN_PITCH = 5;
const GRAIN_STROKE = 2;
const GRAIN_ANGLE = 52;

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
  // useId() returns ':r1:'/'«r1»'-style values depending on the React
  // version; SVG ids referenced through url(#…) must stay alphanumeric.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
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
  const diagonal = size
    ? Math.ceil(Math.sqrt(size.w * size.w + size.h * size.h))
    : 0;

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

          </Defs>

          <Rect width={size.w} height={size.h} fill={`url(#${washAId})`} />
          {showWashB ? (
            <Rect width={size.w} height={size.h} fill={`url(#${washBId})`} />
          ) : null}
        </Svg>
      ) : null}

      {/* ── Grain ──────────────────────────────────────────────────────
          Its own layer, tilted by a React Native view transform rather
          than anything inside the SVG.

          Two SVG routes were tried and both come out upright on iOS:
          `patternTransform` on the <Pattern> (unsupported there), and a
          rotate on an enclosing <G> (the iOS backend resolves a
          userSpaceOnUse pattern against the root coordinate system, so
          ancestor transforms never reach it). A style transform on the
          view is handled by the platform's own layout system, so the
          angle survives on both.

          The square is the box's diagonal on a side and centred on it, so
          it still covers every corner once turned; the wrapper clips the
          overhang. */}
      {showGrain && size && size.w > 0 && size.h > 0 ? (
        <View style={[StyleSheet.absoluteFill, styles.grainClip]} pointerEvents="none">
          <View
            style={{
              position: "absolute",
              left: (size.w - diagonal) / 2,
              top: (size.h - diagonal) / 2,
              width: diagonal,
              height: diagonal,
              transform: [{ rotate: `${GRAIN_ANGLE}deg` }],
            }}
          >
            <Svg width={diagonal} height={diagonal}>
              <Defs>
                {/* Upright stripes — the tilt comes from the wrapper.
                    Same alpha caveat as the gradient stops: `fill` drops
                    an rgba string's alpha, so it travels as fillOpacity. */}
                <Pattern
                  id={grainId}
                  patternUnits="userSpaceOnUse"
                  width={GRAIN_PITCH}
                  height={GRAIN_PITCH}
                >
                  <Rect
                    x={0}
                    y={0}
                    width={GRAIN_STROKE}
                    height={GRAIN_PITCH}
                    fill={grain.rgb}
                    fillOpacity={grain.alpha}
                  />
                </Pattern>
              </Defs>
              <Rect
                width={diagonal}
                height={diagonal}
                fill={`url(#${grainId})`}
              />
            </Svg>
          </View>
        </View>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  // Clips the rotated grain square back to the ground's own bounds.
  grainClip: {
    overflow: "hidden",
  },
});
