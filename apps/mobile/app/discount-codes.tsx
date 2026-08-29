import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Line as SvgLine } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius, SHARED_TOKENS, screenTopPadding } from "@/constants/theme";
import {
  Badge,
  CardWash,
  EmptyState,
  DiscountCodeListSkeleton,
  Ground,
} from "@/components";
import { useDiscountCodes } from "@/hooks/usePublicData";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { getOrCreateDeviceId } from "@/lib/device-id";
import { formatPrice } from "@/lib/format-price";
import {
  redeemDiscountCode,
  PublicApiError,
  type DiscountCode as ActiveDiscountCode,
} from "@/lib/api";
import type { TFunction } from "i18next";

type CardState = "idle" | "redeeming" | "redeemed" | "error";

type ErrorInfo = {
  message: string;
  isAlreadyRedeemed: boolean;
};

function formatDiscountValue(
  t: TFunction,
  type: ActiveDiscountCode["type"],
  value: ActiveDiscountCode["value"]
): string {
  if (type === "PERCENTAGE") {
    // Percentages are stored as whole numbers (e.g. 10 = 10%). The formatPrice
    // helper still applies its NaN guard so a malformed value renders as "—".
    const pct = formatPrice(value, { fractionDigits: 0 });
    return t("offers.percentOff", { value: pct });
  }
  return t("offers.euroOff", { value: formatPrice(value) });
}

function describeExpiry(t: TFunction, expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  return t("offers.expires", { date: d.toLocaleDateString() });
}

export default function OffersScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching, error } = useDiscountCodes();

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [cardErrors, setCardErrors] = useState<Record<string, ErrorInfo>>({});
  // Gesture "enabled" is derived from React state (see the card's pan
  // gesture), which is recomputed a render after setCardState commits --
  // a fast release-then-redrag on the same card can fire performRedeem
  // again before that commit lands. This ref is checked/set synchronously,
  // so it closes that gap regardless of render timing.
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getOrCreateDeviceId()
      .then((id) => {
        if (!cancelled) setDeviceId(id);
      })
      .catch(() => {
        if (!cancelled) setDeviceId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCardState = useCallback((id: string, next: CardState) => {
    setCardStates((prev) => ({ ...prev, [id]: next }));
  }, []);

  const setCardError = useCallback((id: string, info: ErrorInfo | null) => {
    setCardErrors((prev) => {
      if (!info) {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: info };
    });
  }, []);

  const performRedeem = useCallback(
    async (code: ActiveDiscountCode) => {
      if (inFlightRef.current.has(code.id)) return;
      inFlightRef.current.add(code.id);

      try {
        if (!deviceId) {
          setCardState(code.id, "error");
          setCardError(code.id, {
            message: t("offers.deviceIdError"),
            isAlreadyRedeemed: false,
          });
          return;
        }
        setCardState(code.id, "redeeming");
        setCardError(code.id, null);
        try {
          await redeemDiscountCode({
            code: code.code,
            deviceId,
            branchId: code.scopeBranchId ?? undefined,
          });
          setCardState(code.id, "redeemed");
        } catch (err) {
          const isPublic = err instanceof PublicApiError;
          const isAlreadyRedeemedByDevice =
            isPublic && err.errorCode === "ALREADY_REDEEMED_BY_DEVICE";
          const isAlreadyRedeemedByUser =
            isPublic && err.errorCode === "ALREADY_REDEEMED_BY_USER";
          const isAlreadyRedeemed = isAlreadyRedeemedByDevice || isAlreadyRedeemedByUser;
          setCardState(code.id, "error");
          setCardError(code.id, {
            message: isAlreadyRedeemedByDevice
              ? t("offers.errorAlreadyRedeemedDevice")
              : isAlreadyRedeemedByUser
                ? t("offers.errorAlreadyRedeemedUser")
                : isPublic
                  ? err.message
                  : t("offers.errorGeneric"),
            isAlreadyRedeemed,
          });
        }
      } finally {
        inFlightRef.current.delete(code.id);
      }
    },
    [deviceId, setCardError, setCardState, t]
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <Ground style={[styles.padded, { paddingTop: screenTopPadding(insets.top) }]}>
        <DiscountCodeListSkeleton count={3} />
      </Ground>
    );
  }

  if (error && !data?.length) {
    // A failed background revalidation of cached codes still sets `error`
    // even when stale `data` is available -- only show the hard error
    // state when there's genuinely nothing to display.
    return (
      <Ground
        style={[
          styles.padded,
          styles.emptyContainer,
          { paddingTop: screenTopPadding(insets.top) },
        ]}
      >
        <EmptyState
          title={t("offers.errorTitle")}
          message={t("offers.errorMessage")}
        />
      </Ground>
    );
  }

  const codes = data ?? [];

  return (
    <Ground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: screenTopPadding(insets.top) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.gold}
            colors={[theme.gold]}
          />
        }
      >
        <Text style={[typography.displayLg, styles.title, { color: theme.text }]}>
          {t("offers.title")}
        </Text>
        <Text style={[typography.bodyMd, styles.subtitle, { color: theme.textMuted }]}>
          {t("offers.razorSubtitle")}
        </Text>

        {codes.length === 0 ? (
          <EmptyState
            title={t("offers.emptyTitle")}
            message={t("offers.emptyMessage")}
          />
        ) : (
          codes.map((code) => {
            const state = cardStates[code.id] ?? "idle";
            const err = cardErrors[code.id];
            return (
              <RazorCouponCard
                key={code.id}
                code={code}
                state={state}
                error={err}
                width={width}
                onRedeem={() => performRedeem(code)}
                onReset={() => {
                  setCardState(code.id, "idle");
                  setCardError(code.id, null);
                }}
              />
            );
          })
        )}
      </ScrollView>
    </Ground>
  );
}

interface RazorCouponCardProps {
  code: ActiveDiscountCode;
  state: CardState;
  error: ErrorInfo | undefined;
  width: number;
  onRedeem: () => void;
  onReset: () => void;
}

// Fraction of the perforation the razor must travel before the cut
// completes on its own. Below this it springs back.
const CUT_THRESHOLD = 0.6;

// ── Coupon geometry (from the reference) ──────────────────────────────
// The razor occupies a 30dp lane starting 10dp in from the card edge, and
// the card's text block is inset 60dp — so there is a clean 20dp of air
// between the handle and the first character at rest, and the 10dp idle
// nudge still cannot reach the text.
const RAZOR_LEFT = 10;
const RAZOR_W = 30;
const RAZOR_H = 52;
const TEXT_LANE = 60;
const RAZOR_HIT = 44;
const RAZOR_HIT_H = 56;

// The razor itself: a slim gold handle under a wider steel blade guard.
const GUARD_W = 22;
const GUARD_H = 7;
const HANDLE_W = 7;
const HANDLE_H = 44;

const NOTCH = 12;
const CARD_PAD = 16;
const SCREEN_GUTTER = 22;
const IDLE_NUDGE_COUNT = 3;
const IDLE_NUDGE_INTERVAL = 4000;
const IDLE_NUDGE_DISTANCE = 10;

/**
 * A coupon redeemed by dragging a razor along its perforation.
 *
 * The razor handle is the affordance the bare swipe was missing: it shows
 * where to start and which way to go. Redemption itself is unchanged --
 * `onRedeem()` is the same call the previous swipe fired, invoked at the
 * moment the cut completes.
 */
function RazorCouponCard({
  code,
  state,
  error,
  width,
  onRedeem,
  onReset,
}: RazorCouponCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();

  // Travel available to the razor: the card's inner width, less where the
  // razor starts, its own width, and the padding it stops short of.
  const track = Math.max(
    120,
    width - SCREEN_GUTTER * 2 - RAZOR_LEFT - RAZOR_W - CARD_PAD,
  );

  // Where the perforation actually falls in the card. Measured rather than
  // assumed: the two halves have different heights depending on whether a
  // coupon carries an expiry, so a fixed offset would leave the razor
  // floating off its own cut line.
  const [perfCenterY, setPerfCenterY] = useState<number | null>(null);

  const razorX = useSharedValue(0);
  const cutProgress = useSharedValue(0); // 0 dashed -> 1 solid gold
  const splitProgress = useSharedValue(0); // 0 joined -> 1 halves separated
  const hintOpacity = useSharedValue(1);
  const nudge = useSharedValue(0);

  const isSettled = state === "redeemed";
  const isBusy = state === "redeeming";
  const isError = state === "error";
  const locked = isSettled || isBusy;

  // Idle nudge: three small pulls, then stop, so the hint never becomes
  // permanent visual noise.
  useEffect(() => {
    if (reduceMotion || locked) return;
    let fired = 0;
    const id = setInterval(() => {
      if (fired >= IDLE_NUDGE_COUNT) {
        clearInterval(id);
        return;
      }
      fired += 1;
      nudge.value = withSequence(
        withTiming(IDLE_NUDGE_DISTANCE, { duration: 240, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 340, easing: Easing.inOut(Easing.quad) }),
      );
    }, IDLE_NUDGE_INTERVAL);
    return () => clearInterval(id);
  }, [reduceMotion, locked, nudge]);

  // Drive the settled visual whenever the parent reports success, including
  // when that happens without a drag (e.g. state restored on remount).
  useEffect(() => {
    if (!isSettled) return;
    cutProgress.value = withTiming(1, { duration: 240 });
    splitProgress.value = withTiming(1, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
    razorX.value = withTiming(track, {
      duration: 260,
      easing: Easing.out(Easing.quad),
    });
  }, [isSettled, cutProgress, splitProgress, razorX, track]);

  // A failed redemption puts the razor back so the user can try again.
  useEffect(() => {
    if (isSettled || isBusy) return;
    razorX.value = withSpring(0, { damping: 18, stiffness: 180 });
    cutProgress.value = withTiming(0, { duration: 200 });
    splitProgress.value = withTiming(0, { duration: 200 });
  }, [isSettled, isBusy, razorX, cutProgress, splitProgress]);

  const fireRedeem = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      // Unsupported device/simulator — the cut still completes.
    });
    onRedeem();
  }, [onRedeem]);

  const hideHint = useCallback(() => {
    hintOpacity.value = withTiming(0, { duration: 180 });
  }, [hintOpacity]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!locked)
        .activeOffsetX([-10, 10])
        .failOffsetY([-14, 14])
        .onStart(() => {
          runOnJS(hideHint)();
        })
        .onUpdate((e) => {
          const x = Math.min(track, Math.max(0, e.translationX));
          razorX.value = x;
          cutProgress.value = x / track;
        })
        .onEnd(() => {
          if (razorX.value >= track * CUT_THRESHOLD) {
            // Past the threshold the cut finishes on its own.
            razorX.value = withTiming(track, {
              duration: 220,
              easing: Easing.out(Easing.quad),
            });
            cutProgress.value = withTiming(1, { duration: 220 });
            splitProgress.value = withDelay(
              160,
              withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
            );
            runOnJS(fireRedeem)();
          } else {
            razorX.value = withSpring(0, { damping: 18, stiffness: 180 });
            cutProgress.value = withTiming(0, { duration: 200 });
          }
        }),
    [locked, track, razorX, cutProgress, splitProgress, fireRedeem, hideHint],
  );

  const razorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: razorX.value + nudge.value }],
  }));
  const cutLineStyle = useAnimatedStyle(() => ({
    opacity: cutProgress.value,
    transform: [{ scaleX: cutProgress.value }],
  }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));
  const lowerHalfStyle = useAnimatedStyle(() => ({
    opacity: interpolate(splitProgress.value, [0, 1], [1, 0.35]),
    transform: [{ translateY: interpolate(splitProgress.value, [0, 1], [0, 6]) }],
  }));

  const expiry = describeExpiry(t, code.expiresAt);
  const meta = [expiry, code.scopeBranch?.name].filter(Boolean).join(" · ");

  return (
    <View style={styles.cardWrapper}>
      <View
        style={[
          styles.coupon,
          {
            backgroundColor: theme.surface,
            borderColor: isSettled ? theme.hairline : theme.hairlineStrong,
          },
          isSettled && styles.couponSettled,
        ]}
      >
        <CardWash />

        {/* Upper half — the part that stays after the cut. */}
        <View style={styles.couponTop}>
          <Text
            style={[typography.micro, styles.upper, { color: theme.goldText }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {code.code}
          </Text>
          <Text
            style={[typography.displayMd, { color: theme.text }]}
            numberOfLines={1}
          >
            {formatDiscountValue(t, code.type, code.value)}
          </Text>
        </View>

        {/* Perforation: notches punched into both edges, dashed line
            between them, and a solid gold line that wipes in as the razor
            travels. */}
        <View
          style={styles.perforation}
          pointerEvents="none"
          onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            const center = y + height / 2;
            setPerfCenterY((prev) => (prev === center ? prev : center));
          }}
        >
          <View
            style={[
              styles.notch,
              styles.notchLeft,
              { backgroundColor: theme.ground, borderColor: theme.hairline },
            ]}
          />
          <View style={styles.perfLineWrap}>
            {/* Drawn as SVG rather than a dashed border: Android renders
                `borderStyle: "dashed"` as a solid rule, so the perforation
                lost its dashes on device. */}
            <Svg width="100%" height={2} style={styles.perfDashed}>
              <SvgLine
                x1={0}
                y1={1}
                x2="100%"
                y2={1}
                stroke={theme.gold}
                strokeOpacity={0.35}
                strokeWidth={2}
                strokeDasharray="5 4"
              />
            </Svg>
            <Animated.View
              style={[styles.perfSolid, { backgroundColor: theme.gold }, cutLineStyle]}
            />
          </View>
          <View
            style={[
              styles.notch,
              styles.notchRight,
              { backgroundColor: theme.ground, borderColor: theme.hairline },
            ]}
          />
        </View>

        {/* Lower half — drops and fades once cut. */}
        <Animated.View style={[styles.couponBottom, lowerHalfStyle]}>
          {meta ? (
            <Text
              style={[typography.bodySm, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {meta}
            </Text>
          ) : null}
        </Animated.View>

        {/* Razor + drag hint, riding the perforation line. */}
        {!isSettled ? (
          <View style={styles.razorLayer} pointerEvents="box-none">
            <GestureDetector gesture={pan}>
              <Animated.View
                style={[
                  styles.razorHit,
                  perfCenterY != null
                    ? { top: perfCenterY - RAZOR_HIT_H / 2 }
                    : null,
                  razorStyle,
                ]}
              >
                {/* Guard and handle are one rigid object: the whole
                    assembly is what translates, never its parts. */}
                <View style={styles.razorBody}>
                  <LinearGradient
                    colors={[
                      SHARED_TOKENS.razorSteelLight,
                      SHARED_TOKENS.razorSteelDark,
                    ]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.razorGuard}
                  />
                  <LinearGradient
                    colors={[
                      SHARED_TOKENS.razorGoldLight,
                      SHARED_TOKENS.razorGoldDark,
                    ]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.razorHandle}
                  />
                </View>
              </Animated.View>
            </GestureDetector>

            {/* The hint rides the same line the razor cuts along, so it
                needs the card's own fill behind it — otherwise the dashes
                run straight through the label like a strikethrough. */}
            <Animated.View
              style={[
                styles.hint,
                { backgroundColor: theme.surface },
                perfCenterY != null ? { top: perfCenterY - 10 } : null,
                hintStyle,
              ]}
              pointerEvents="none"
            >
              <Text
                style={[typography.microXs, styles.upper, { color: theme.textMuted }]}
                allowFontScaling={false}
              >
                {t("offers.dragHint")}
              </Text>
              <Text style={[typography.bodySm, { color: theme.textMuted }]}>›››</Text>
            </Animated.View>
          </View>
        ) : null}

        {/* Status row: the redeemed code, or in-flight feedback. */}
        {isSettled ? (
          <View style={styles.statusRow}>
            <Text style={[typography.priceSm, { color: theme.goldText }]} numberOfLines={1}>
              {code.code}
            </Text>
            <Badge label={t("offers.redeemed")} variant="success" />
          </View>
        ) : isBusy ? (
          <View style={styles.statusRow}>
            <Badge label={t("offers.redeeming")} variant="primary" />
          </View>
        ) : null}
      </View>

      {isError && error ? (
        <Text
          style={[
            typography.bodySm,
            styles.errorText,
            { color: error.isAlreadyRedeemed ? theme.textMuted : theme.danger },
          ]}
        >
          {error.message}
          {!error.isAlreadyRedeemed ? " " : null}
          {!error.isAlreadyRedeemed ? (
            <Text
              style={[typography.bodySm, styles.errorReset, { color: theme.gold }]}
              onPress={onReset}
            >
              {t("offers.reset")}
            </Text>
          ) : null}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The razor's lift. Applied to the guard and the handle individually rather
 * than to their transparent parent, which casts no iOS shadow of its own.
 */
const razorLift = {
  shadowColor: SHARED_TOKENS.shadow,
  shadowOpacity: 0.6,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padded: {
    padding: SCREEN_GUTTER,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: SCREEN_GUTTER,
    gap: 14,
    paddingBottom: 32,
  },
  // Reference rhythm: 20 between title and subtitle, 20 down to the first
  // card, 14 between cards. The container's 14 gap carries the last one.
  title: {
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 6,
  },
  cardWrapper: {
    gap: 6,
  },
  coupon: {
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingVertical: 14,
  },
  couponSettled: {
    opacity: 0.7,
  },
  // Every text block clears the razor's lane on the left. The handle is
  // absolutely positioned, so without this inset it sits on top of the
  // discount numeral instead of beside it.
  couponTop: {
    paddingLeft: TEXT_LANE,
    paddingRight: CARD_PAD,
    gap: 6,
    marginBottom: 14,
  },
  perforation: {
    height: NOTCH,
    justifyContent: "center",
  },
  notch: {
    position: "absolute",
    top: 0,
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  notchLeft: {
    left: -NOTCH / 2,
  },
  notchRight: {
    right: -NOTCH / 2,
  },
  perfLineWrap: {
    marginHorizontal: CARD_PAD,
    height: 2,
    justifyContent: "center",
  },
  perfDashed: {
    width: "100%",
  },
  perfSolid: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
    transformOrigin: "0% 50%",
  },
  couponBottom: {
    paddingLeft: TEXT_LANE,
    paddingRight: CARD_PAD,
    marginTop: 14,
  },
  razorLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  razorHit: {
    position: "absolute",
    // Overridden the moment the perforation reports its position; this is
    // only the value for the single frame before that lands.
    top: 0,
    // Centres the 44dp hit area on the visually narrower handle lane.
    left: RAZOR_LEFT - (RAZOR_HIT - RAZOR_W) / 2,
    width: RAZOR_HIT,
    height: RAZOR_HIT_H,
    alignItems: "center",
    justifyContent: "center",
  },
  razorBody: {
    width: RAZOR_W,
    height: RAZOR_H,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  // The blade guard: wider than the handle and in cool steel, so the eye
  // reads a straight razor held guard-up rather than a gold toggle knob.
  razorGuard: {
    width: GUARD_W,
    height: GUARD_H,
    borderRadius: 1.5,
    ...razorLift,
  },
  razorHandle: {
    width: HANDLE_W,
    height: HANDLE_H,
    borderRadius: HANDLE_W / 2,
    ...razorLift,
  },
  hint: {
    position: "absolute",
    right: CARD_PAD,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 8,
    paddingVertical: 3,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: TEXT_LANE,
    paddingRight: CARD_PAD,
    marginTop: 12,
    gap: 8,
  },
  upper: {
    textTransform: "uppercase",
  },
  errorText: {
    paddingHorizontal: 8,
  },
  errorReset: {
    fontFamily: "Manrope_600SemiBold",
  },
});
