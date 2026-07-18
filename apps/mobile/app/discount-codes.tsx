import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Badge,
  Card,
  EmptyState,
  DiscountCodeListSkeleton,
} from "@/components";
import { useDiscountCodes } from "@/hooks/usePublicData";
import { getOrCreateDeviceId } from "@/lib/device-id";
import {
  redeemDiscountCode,
  PublicApiError,
  type DiscountCode as ActiveDiscountCode,
} from "@/lib/api";

type CardState = "idle" | "redeeming" | "redeemed" | "error";

type ErrorInfo = {
  message: string;
  isAlreadyRedeemed: boolean;
};

function formatDiscountValue(
  type: ActiveDiscountCode["type"],
  value: ActiveDiscountCode["value"]
): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(num)) return "—";
  return type === "PERCENTAGE" ? `${num}% off` : `€${num.toFixed(2)} off`;
}

function describeExpiry(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return null;
  return `Expires ${d.toLocaleDateString()}`;
}

export default function OffersScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data, isLoading, refetch, isRefetching, error } = useDiscountCodes();

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [cardErrors, setCardErrors] = useState<Record<string, ErrorInfo>>({});

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
      if (!deviceId) {
        setCardState(code.id, "error");
        setCardError(code.id, {
          message: "Could not read device id. Please restart the app.",
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
        const isAlreadyRedeemed =
          isPublic && err.errorCode === "ALREADY_REDEEMED_BY_DEVICE";
        setCardState(code.id, "error");
        setCardError(code.id, {
          message: isAlreadyRedeemed
            ? "You already redeemed this code on this device."
            : isPublic
              ? err.message
              : "Could not redeem. Please try again.",
          isAlreadyRedeemed,
        });
      }
    },
    [deviceId, setCardError, setCardState]
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

  if (error) {
    return (
      <View
        style={[
          styles.container,
          styles.emptyContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <EmptyState
          title="Could not load offers"
          message="Please try again in a moment."
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
        { paddingTop: insets.top + 16 },
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
      <Text style={[styles.title, { color: theme.text }]}>Offers</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Swipe a card right to redeem the code on this device.
      </Text>

      {codes.length === 0 ? (
        <EmptyState
          title="No offers right now"
          message="Check back later for exclusive deals."
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
                {formatDiscountValue(code.type, code.value)}
              </Text>
              {describeExpiry(code.expiresAt) ? (
                <Text style={[styles.codeExpiry, { color: theme.textMuted }]}>
                  {describeExpiry(code.expiresAt)}
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
                <Badge label="Redeeming…" variant="primary" />
              ) : isRedeemed ? (
                <Badge label="Redeemed" variant="success" />
              ) : isError ? (
                <Badge
                  label={error?.isAlreadyRedeemed ? "Already used" : "Try again"}
                  variant="danger"
                />
              ) : (
                <Badge label="Swipe →" variant="default" />
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
              Reset
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
