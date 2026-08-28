import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { Gift, Sparkles } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  MIN_REDEEM_POINTS,
  POINTS_PER_EURO,
} from "@funfsterne/shared-types";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius, screenTopPadding } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { Card, Button, Badge, EmptyState, Ground } from "@/components";
import { useLoyaltyMe } from "@/hooks/usePublicData";
import { redeemLoyaltyPoints, PublicApiError } from "@/lib/api";
import { queryClient } from "@/lib/query-client";

const QR_PREFIX = "funfsterne:loyalty:";

function describeTransaction(
  t: TFunction,
  note: string | null,
  branch?: { name: string } | null
): string {
  if (branch?.name) return t("loyalty.visitAt", { branch: branch.name });
  return note ?? t("loyalty.visit");
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LoyaltyScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading, isRefetching, refetch, error } = useLoyaltyMe();
  const [redeeming, setRedeeming] = useState(false);

  // Derived from `data`, and referenced by the hooks below -- declared here
  // (rather than after the early-return branches further down) so they're
  // always available regardless of loading/error state, and so the effects
  // that depend on them aren't reading a not-yet-declared variable.
  const balance = data?.balance ?? 0;
  const redeemablePoints = Math.floor(balance / POINTS_PER_EURO) * POINTS_PER_EURO;
  const canRedeem = redeemablePoints >= MIN_REDEEM_POINTS;
  const progressToNext = balance % MIN_REDEEM_POINTS;
  const progressPct = Math.min(100, Math.round((progressToNext / MIN_REDEEM_POINTS) * 100));
  const qrValue = user ? `${QR_PREFIX}${user.id}` : "";
  const activeRewards = data?.rewards.filter((r) => r.status === "ACTIVE") ?? [];
  const pastRewards = data?.rewards.filter((r) => r.status === "REDEEMED") ?? [];

  // Detects points earned since the last time this screen had fresh data,
  // so a staff scan that happened while the app was backgrounded (or on
  // another tab) still gets celebrated the next time the customer looks.
  // A ref survives re-renders without retriggering effects, and starts at
  // null so the very first load never counts as "an increase."
  const lastBalanceRef = useRef<number | null>(null);
  const [celebration, setCelebration] = useState<number | null>(null);
  // Starts at 1 (not 0) -- this drives the balance card's scale transform,
  // and a shared value only ever gets updated by the celebration effect
  // below. Starting at 0 left the card invisible on every first load, only
  // becoming visible once a celebration animation happened to run and left
  // it parked at 1.
  const celebrationScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  useEffect(() => {
    if (data === undefined) return;
    const prev = lastBalanceRef.current;
    const justIncreased = prev !== null && data.balance > prev;

    if (justIncreased) {
      const gained = data.balance - prev;
      setCelebration(gained);
      celebrationScale.value = withSequence(
        withSpring(1.15, { stiffness: 300, damping: 12 }),
        withSpring(1, { stiffness: 300, damping: 14 })
      );
      progressWidth.value = withTiming(progressPct / 100, { duration: 600 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
        // ignore
      });
      const timeout = setTimeout(() => setCelebration(null), 3200);
      lastBalanceRef.current = data.balance;
      return () => clearTimeout(timeout);
    }

    // First load, a no-op refetch, or a redemption (balance went down) --
    // snap straight to the correct position instead of animating, so the
    // bar never opens with a misleading fill-from-empty flash. Motion is
    // reserved for the one moment it actually means something: a fresh
    // scan raised the balance.
    progressWidth.value = progressPct / 100;
    lastBalanceRef.current = data.balance;
  }, [data, progressPct, celebrationScale, progressWidth]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
  }));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  const handleRedeem = useCallback(
    (points: number) => {
      const euros = (points / POINTS_PER_EURO).toFixed(0);
      Alert.alert(
        t("loyalty.redeemConfirmTitle"),
        t("loyalty.redeemConfirmMessage", { points, euros }),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("loyalty.redeem"),
            onPress: async () => {
              setRedeeming(true);
              try {
                await redeemLoyaltyPoints(points);
                await queryClient.invalidateQueries({ queryKey: ["loyalty", "me"] });
              } catch (err) {
                const message =
                  err instanceof PublicApiError && err.errorCode === "INSUFFICIENT_POINTS"
                    ? t("loyalty.redeemErrorInsufficientPoints")
                    : t("loyalty.redeemErrorGeneric");
                Alert.alert(t("loyalty.redeemErrorTitle"), message);
              } finally {
                setRedeeming(false);
              }
            },
          },
        ]
      );
    },
    [t]
  );

  if (isLoading) {
    return (
      <Ground style={styles.center}>
        <ActivityIndicator color={theme.gold} />
      </Ground>
    );
  }

  if (error && !data) {
    return (
      <Ground style={styles.center}>
        <EmptyState title={t("loyalty.loadErrorTitle")} message={t("loyalty.loadErrorMessage")} />
      </Ground>
    );
  }

  return (
    <Ground>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: screenTopPadding(insets.top) }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.gold}
          colors={[theme.gold]}
        />
      }
    >
      <Text style={[typography.displayLg, { color: theme.text }]}>{t("loyalty.title")}</Text>

      {celebration !== null ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(300)}
          style={[styles.celebrationBanner, { backgroundColor: theme.gold }]}
        >
          <Sparkles size={16} color={theme.onGold} />
          <Text style={[styles.celebrationText, { color: theme.onGold }]}>
            {t("loyalty.pointsEarnedToday", { count: celebration })}
          </Text>
        </Animated.View>
      ) : null}

      <Card style={styles.balanceCard}>
        <Text style={[typography.micro, styles.balanceLabel, { color: theme.textMuted }]}>
          {t("loyalty.yourPoints")}
        </Text>
        <Animated.Text style={[styles.balanceValue, { color: theme.goldText }, celebrationStyle]}>
          {balance}
        </Animated.Text>

        <View
          style={[
            styles.progressTrack,
            { backgroundColor: theme.muted, borderColor: theme.hairline },
          ]}
        >
          <Animated.View
            style={[styles.progressFill, { backgroundColor: theme.gold }, progressFillStyle]}
          />
        </View>
        <Text style={[typography.bodySm, { color: theme.textMuted }]}>
          {canRedeem
            ? t("loyalty.pointsReadyToRedeem", { count: redeemablePoints })
            : t("loyalty.pointsToFirstReward", { count: MIN_REDEEM_POINTS - progressToNext })}
        </Text>

        {canRedeem ? (
          <Button
            title={
              redeeming
                ? t("loyalty.redeeming")
                : t("loyalty.redeemButton", {
                    points: redeemablePoints,
                    euros: redeemablePoints / POINTS_PER_EURO,
                  })
            }
            onPress={() => handleRedeem(redeemablePoints)}
            disabled={redeeming}
            style={styles.redeemButton}
          />
        ) : null}
      </Card>

      <Card style={styles.qrCard}>
        <Text style={[typography.displayMd, { color: theme.text }]}>{t("loyalty.myCode")}</Text>
        <Text style={[typography.bodySm, styles.qrHint, { color: theme.textMuted }]}>
          {t("loyalty.myCodeHint")}
        </Text>
        <View style={[styles.qrWrapper, { backgroundColor: theme.qrBackground }]}>
          {qrValue ? (
            <QRCode
              value={qrValue}
              size={180}
              color={theme.qrForeground}
              backgroundColor={theme.qrBackground}
            />
          ) : null}
        </View>
      </Card>

      {activeRewards.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("loyalty.activeRewards")}
          </Text>
          {activeRewards.map((reward) => (
            <Card key={reward.id} style={styles.rewardRow}>
              <View style={[styles.rewardIcon, { backgroundColor: theme.muted }]}>
                <Gift size={18} color={theme.gold} />
              </View>
              <View style={styles.rewardInfo}>
                <Text style={[styles.rewardValue, { color: theme.text }]}>
                  {t("loyalty.voucher", { value: reward.eurosValue })}
                </Text>
                <Text style={[styles.rewardMeta, { color: theme.textMuted }]}>
                  {t("loyalty.showCodeToUse")}
                </Text>
              </View>
              <Badge label={t("loyalty.activeBadge")} variant="primary" />
            </Card>
          ))}
        </View>
      ) : null}

      {data && data.transactions.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("loyalty.recentActivity")}
          </Text>
          {data.transactions.slice(0, 10).map((tx) => (
            <View key={tx.id} style={styles.historyRow}>
              <View style={styles.historyInfo}>
                <Text style={[styles.historyLabel, { color: theme.text }]}>
                  {tx.type === "EARN"
                    ? describeTransaction(t, tx.note, tx.branch)
                    : t("loyalty.redeemedReward")}
                </Text>
                <Text style={[styles.historyDate, { color: theme.textMuted }]}>
                  {formatDate(tx.createdAt)}
                </Text>
              </View>
              <Text
                style={[
                  styles.historyPoints,
                  { color: tx.points >= 0 ? theme.gold : theme.textMuted },
                ]}
              >
                {tx.points >= 0 ? `+${tx.points}` : tx.points}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {pastRewards.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("loyalty.usedRewards")}
          </Text>
          {pastRewards.slice(0, 5).map((reward) => (
            <View key={reward.id} style={styles.historyRow}>
              <Text style={[styles.historyLabel, { color: theme.textMuted }]}>
                {t("loyalty.voucher", { value: reward.eurosValue })}
              </Text>
              <Text style={[styles.historyDate, { color: theme.textMuted }]}>
                {reward.redeemedAt ? formatDate(reward.redeemedAt) : ""}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
    </Ground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  celebrationBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  celebrationText: {
    ...typography.micro,
    textTransform: "uppercase",
  },
  balanceCard: {
    alignItems: "center",
    gap: 6,
  },
  balanceLabel: {
    textTransform: "uppercase",
  },
  balanceValue: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 48,
    lineHeight: 56,
  },
  progressTrack: {
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  redeemButton: {
    width: "100%",
    marginTop: 12,
  },
  qrCard: {
    alignItems: "center",
    gap: 4,
  },
  qrHint: {
    textAlign: "center",
    marginBottom: 8,
  },
  qrWrapper: {
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    ...typography.displayMd,
  },
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rewardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  rewardInfo: {
    flex: 1,
    gap: 2,
  },
  rewardValue: {
    ...typography.bodyLg,
  },
  rewardMeta: {
    fontSize: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  historyInfo: {
    gap: 2,
  },
  historyLabel: {
    ...typography.bodyMd,
  },
  historyDate: {
    fontSize: 12,
  },
  historyPoints: {
    ...typography.priceSm,
  },
});
