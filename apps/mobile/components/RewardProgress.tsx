import { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { ChevronRight } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  MIN_REDEEM_POINTS,
  POINTS_PER_EURO,
  POINTS_PER_VISIT,
} from "@funfsterne/shared-types";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius } from "@/constants/theme";
import { useArabicTextStyle } from "@/hooks/useArabicText";
import { useReduceMotion } from "@/hooks/useReduceMotion";

/**
 * Loyalty progress as a row of stamps, shown at the top of the home sheet.
 *
 * This replaced a 42pt ring in the hero that drew the raw balance over the
 * portrait. The ring's problem was never its size: it printed a bare number
 * with no unit, no goal and no reward attached, and it was pointerEvents
 * "none", so it could not even be tapped. Moving that number into a bar would
 * have inherited all three faults.
 *
 * Ten stamps rather than a continuous bar because the shop's own economics
 * are already a punch card -- POINTS_PER_VISIT is exactly a tenth of
 * MIN_REDEEM_POINTS, so a reward is exactly ten visits. A bar creeping 10% per
 * haircut is imperceptible; a stamp lighting up is an event. It also counts in
 * the customer's unit: nobody plans around "90 points", everyone understands
 * "nine more haircuts".
 *
 * Purely presentational -- the caller owns the data and the navigation.
 */

/** Ten, derived rather than hardcoded so a pricing change cannot desync it. */
const TOTAL_STAMPS = Math.max(
  1,
  Math.round(MIN_REDEEM_POINTS / POINTS_PER_VISIT),
);

/** What a completed card is worth, in euros. */
const REWARD_EUROS = MIN_REDEEM_POINTS / POINTS_PER_EURO;

export interface RewardProgressProps {
  /** Current balance. Values above MIN_REDEEM_POINTS read as complete. */
  points: number;
  /** Invoked on tap. Omit to render the card inert. */
  onPress?: () => void;
}

export function RewardProgress({ points, onPress }: RewardProgressProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const arabicText = useArabicTextStyle();
  const reduceMotion = useReduceMotion();

  const { earned, remaining, complete } = useMemo(() => {
    const safe = Number.isFinite(points) ? Math.max(0, points) : 0;
    const filled = Math.min(
      TOTAL_STAMPS,
      Math.floor(safe / POINTS_PER_VISIT),
    );
    return {
      earned: filled,
      remaining: TOTAL_STAMPS - filled,
      complete: safe >= MIN_REDEEM_POINTS,
    };
  }, [points]);

  // Four distinct messages rather than one templated string. The endpoints are
  // where the encouragement actually lives: a customer at zero needs to know
  // the programme exists, and one at nine needs to be told they are one cut
  // away -- neither is served by "9 more visits".
  const message = complete
    ? t("home.rewardReadyMessage", { value: REWARD_EUROS })
    : earned === 0
      ? t("home.rewardFirstVisit")
      : remaining === 1
        ? t("home.rewardLastVisit")
        : t("home.rewardVisitsLeft", {
            count: remaining,
            value: REWARD_EUROS,
          });

  const body = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: complete ? theme.muted : theme.surface,
          borderColor: complete ? theme.gold : theme.hairlineStrong,
        },
      ]}
    >
      <View style={styles.head}>
        <Text
          style={[
            typography.microXs,
            styles.label,
            arabicText,
            { color: complete ? theme.goldText : theme.textMuted },
          ]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {complete ? t("home.rewardReadyLabel") : t("home.rewardLabel")}
        </Text>
        <Text
          style={[typography.microXs, styles.count, { color: theme.goldText }]}
          numberOfLines={1}
          allowFontScaling={false}
          // A count is digits and a slash in every one of our languages, so it
          // is never mirrored or reshaped.
        >
          {`${earned} / ${TOTAL_STAMPS}`}
        </Text>
      </View>

      <View
        style={styles.stamps}
        accessible
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: TOTAL_STAMPS, now: earned }}
      >
        {Array.from({ length: TOTAL_STAMPS }, (_, i) => {
          const on = i < earned;
          const stamp = (
            <View
              style={[
                styles.stamp,
                i === 0 && styles.stampFirst,
                i === TOTAL_STAMPS - 1 && styles.stampLast,
                {
                  backgroundColor: on
                    ? theme.gold
                    : theme.hairlineStrong,
                },
              ]}
            />
          );

          // Filled stamps fade in left to right on mount, so returning to the
          // screen after a scan replays the card filling up. Unfilled stamps
          // are static -- animating them would imply progress that is not
          // there.
          if (!on || reduceMotion) {
            return (
              <View key={i} style={styles.stampSlot}>
                {stamp}
              </View>
            );
          }
          return (
            <Animated.View
              key={i}
              style={styles.stampSlot}
              entering={FadeIn.delay(i * 45).duration(240)}
            >
              {stamp}
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.foot}>
        <Text
          style={[
            typography.bodySm,
            styles.message,
            arabicText,
            { color: theme.text },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>
        {onPress ? (
          <ChevronRight size={16} color={theme.goldText} />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${complete ? t("home.rewardReadyLabel") : t("home.rewardLabel")}. ${message}`}
      style={({ pressed }) => [styles.press, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    // The card carries its own margins so the pressable is exactly the card.
    alignSelf: "stretch",
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 14,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  head: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 10,
  },
  label: {
    textTransform: "uppercase",
    // Lets a long translation shrink rather than push the count off the row.
    flexShrink: 1,
  },
  count: {
    flexShrink: 0,
  },
  stamps: {
    flexDirection: "row",
    gap: 3,
  },
  stampSlot: {
    flex: 1,
    // Without this a long row cannot shrink below its content on narrow
    // screens, which is what pushed the admin shell to 851px.
    minWidth: 0,
  },
  stamp: {
    height: 7,
    borderRadius: 2,
  },
  stampFirst: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  stampLast: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  message: {
    flexShrink: 1,
  },
});
