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
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Badge,
  Card,
  EmptyState,
  DiscountCodeListSkeleton,
} from "@/components";
import { useDiscountCodes } from "@/hooks/usePublicData";
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
  const { data, isLoading, refetch, isRefetching, error } = useDiscountCodes();

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [cardErrors, setCardErrors] = useState<Record<string, ErrorInfo>>({});
  // Gesture "enabled" is derived from React state (see SwipeableCodeCard's
  // panGesture), which is recomputed a render after setCardState commits --
  // a fast release-then-reswipe on the same card can fire performRedeem
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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <DiscountCodeListSkeleton count={3} />
      </View>
    );
  }

  if (error && !data?.length) {
    // A failed background revalidation of cached codes still sets `error`
    // even when stale `data` is available -- only show the hard error
    // state when there's genuinely nothing to display.
    return (
      <View
        style={[
          styles.container,
          styles.emptyContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <EmptyState
          title={t("offers.errorTitle")}
          message={t("offers.errorMessage")}
        />
      </View>
    );
  }

  const codes = data ?? [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: 12 },
      ]}
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
      <Text style={[styles.title, { color: theme.text }]}>{t("offers.title")}</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        {t("offers.subtitle")}
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
            <SwipeableCodeCard
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
  );
}

interface SwipeableCodeCardProps {
  code: ActiveDiscountCode;
  state: CardState;
  error: ErrorInfo | undefined;
  width: number;
  onRedeem: () => void;
  onReset: () => void;
}

function SwipeableCodeCard({
  code,
  state,
  error,
  width,
  onRedeem,
  onReset,
}: SwipeableCodeCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  // Travel required to count as a "full swipe".
  const triggerDistance = useMemo(
    () => Math.max(140, Math.round(width * 0.6)),
    [width]
  );
  // Cap drag so the card doesn't fly off-screen.
  const maxDrag = useMemo(() => Math.round(width * 0.9), [width]);

  const translateX = useSharedValue(0);

  // Reset to centre whenever the card transitions back to idle.
  useEffect(() => {
    if (state === "idle") {
      translateX.value = withSpring(0, { damping: 18, stiffness: 180 });
    }
  }, [state, translateX]);

  const fireRedeem = useCallback(() => {
    onRedeem();
  }, [onRedeem]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(state === "idle" || state === "error")
        .activeOffsetX([-12, 12])
        .failOffsetY([-12, 12])
        .onUpdate((event) => {
          const x = event.translationX;
          if (x > maxDrag) {
            translateX.value = maxDrag;
          } else if (x < -maxDrag * 0.2) {
            translateX.value = -maxDrag * 0.2;
          } else {
            translateX.value = x;
          }
        })
        .onEnd(() => {
          if (translateX.value >= triggerDistance) {
            translateX.value = withSpring(triggerDistance, {
              damping: 18,
              stiffness: 180,
            });
            runOnJS(fireRedeem)();
          } else {
            translateX.value = withSpring(0, {
              damping: 18,
              stiffness: 180,
            });
          }
        }),
    [state, maxDrag, translateX, triggerDistance, fireRedeem]
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const isRedeeming = state === "redeeming";
  const isRedeemed = state === "redeemed";
  const isError = state === "error";

  return (
    <View style={styles.cardWrapper}>
      <Card style={styles.card}>
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.cardInner,
              cardStyle,
              isRedeemed && styles.cardRedeemed,
              isError && styles.cardError,
              { backgroundColor: theme.surface, borderColor: theme.muted },
            ]}
          >
            <View style={styles.cardInfo}>
              <Text style={[styles.codeLabel, { color: theme.gold }]}>
                {code.code}
              </Text>
              <Text style={[styles.codeValue, { color: theme.text }]}>
                {formatDiscountValue(t, code.type, code.value)}
              </Text>
              {describeExpiry(t, code.expiresAt) ? (
                <Text style={[styles.codeExpiry, { color: theme.textMuted }]}>
                  {describeExpiry(t, code.expiresAt)}
                </Text>
              ) : null}
              {code.scopeBranch?.name ? (
                <Text style={[styles.codeBranch, { color: theme.textMuted }]}>
                  {code.scopeBranch.name}
                </Text>
              ) : null}
            </View>
            <View style={styles.cardActions}>
              {isRedeeming ? (
                <Badge label={t("offers.redeeming")} variant="primary" />
              ) : isRedeemed ? (
                <Badge label={t("offers.redeemed")} variant="success" />
              ) : isError ? (
                <Badge
                  label={error?.isAlreadyRedeemed ? t("offers.alreadyUsed") : t("offers.tryAgain")}
                  variant="danger"
                />
              ) : (
                <Badge label={t("offers.swipe")} variant="default" />
              )}
            </View>
          </Animated.View>
        </GestureDetector>
      </Card>
      {isError && error ? (
        <Text
          style={[
            styles.errorText,
            { color: error.isAlreadyRedeemed ? theme.textMuted : "#EF4444" },
          ]}
        >
          {error.message}
          {!error.isAlreadyRedeemed ? " " : null}
          {!error.isAlreadyRedeemed ? (
            <Text
              style={[styles.errorReset, { color: theme.gold }]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
  },
  cardWrapper: {
    gap: 6,
  },
  card: {
    padding: 0,
    overflow: "hidden",
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  cardRedeemed: {
    opacity: 0.6,
  },
  cardError: {
    opacity: 0.85,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  codeExpiry: {
    fontSize: 12,
  },
  codeBranch: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    paddingHorizontal: 8,
  },
  errorReset: {
    fontWeight: "700",
  },
});
