import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Badge,
  Card,
  EmptyState,
  DiscountCodeListSkeleton,
} from "@/components";
import { useConsumerDiscountCodes } from "@/hooks/useConsumerData";
import { useCurrentUser } from "@/hooks/useAuth";

function formatDiscountValue(
  type: "PERCENTAGE" | "FIXED",
  value: number
): string {
  return type === "PERCENTAGE" ? `${value}% off` : `€${value.toFixed(2)} off`;
}

export default function DiscountCodesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    data: user,
    isLoading: userLoading,
    refetch: refetchUser,
    isRefetching: userRefetching,
  } = useCurrentUser();
  const {
    data: codes,
    isLoading: codesLoading,
    refetch: refetchCodes,
    isRefetching: codesRefetching,
  } = useConsumerDiscountCodes();
  const [revealedCodeId, setRevealedCodeId] = useState<string | null>(null);

  const isRefetching = userRefetching || codesRefetching;

  const handleRefresh = useCallback(() => {
    refetchUser();
    refetchCodes();
  }, [refetchUser, refetchCodes]);

  if (userLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <DiscountCodeListSkeleton count={2} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState
          title="Sign in to see your codes"
          message="Discount codes are tied to your account."
          actionTitle="Sign in"
          onAction={() => router.push("/login")}
        />
      </View>
    );
  }

  if (codesLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <DiscountCodeListSkeleton count={3} />
      </View>
    );
  }

  const insets = useSafeAreaInsets();

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
          onRefresh={handleRefresh}
          tintColor={theme.gold}
          colors={[theme.gold]}
        />
      }
    >
      <Text style={[styles.title, { color: theme.text }]}>Discount Codes</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>
        Tap a code to reveal it. Show it at checkout in any participating
        branch.
      </Text>

      {codes?.length ? (
        <Card style={styles.card}>
          {codes.map((code) => {
            const isRevealed = revealedCodeId === code.id;
            const isRedeemed = code.redeemed;
            return (
              <TouchableOpacity
                key={code.id}
                activeOpacity={0.8}
                style={[
                  styles.row,
                  isRedeemed && styles.rowRedeemed,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.muted,
                  },
                ]}
                onPress={() =>
                  !isRedeemed &&
                  setRevealedCodeId((prev) =>
                    prev === code.id ? null : code.id
                  )
                }
              >
                <View style={styles.info}>
                  <Text style={[styles.codeLabel, { color: theme.gold }]}>
                    {isRevealed ? code.code : "Tap to reveal"}
                  </Text>
                  <Text style={[styles.codeValue, { color: theme.text }]}>
                    {formatDiscountValue(code.type, code.value)}
                  </Text>
                  {code.expiresAt ? (
                    <Text style={[styles.codeExpiry, { color: theme.textMuted }]}>
                      Expires{" "}
                      {new Date(code.expiresAt).toLocaleDateString()}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  {isRedeemed ? (
                    <Badge label="Redeemed" variant="default" />
                  ) : (
                    <>
                      {isRevealed ? (
                        <EyeOff size={18} fill={theme.textMuted} />
                      ) : (
                        <Eye size={18} fill={theme.textMuted} />
                      )}
                      <Badge label="Active" variant="success" />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          title="No discount codes"
          message="Check back later for exclusive offers."
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  card: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  rowRedeemed: {
    opacity: 0.6,
  },
  info: {
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
