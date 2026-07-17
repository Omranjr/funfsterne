import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Eye, EyeOff, LogOut } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Button,
  Card,
  Badge,
  EmptyState,
  BranchPill,
  AccountSkeleton,
  DiscountCodeListSkeleton,
} from "@/components";
import {
  useCurrentUser,
  useUpdateProfile,
  useLogout,
} from "@/hooks/useAuth";
import { useBranches } from "@/hooks/usePublicData";
import { useConsumerDiscountCodes } from "@/hooks/useConsumerData";

function formatDiscountValue(type: "PERCENTAGE" | "FIXED", value: number) {
  return type === "PERCENTAGE" ? `${value}% off` : `€${value.toFixed(2)} off`;
}

export default function AccountScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    data: user,
    isLoading: userLoading,
    refetch: refetchUser,
    isRefetching: userRefetching,
  } = useCurrentUser();
  const {
    data: branches,
    isLoading: branchesLoading,
    refetch: refetchBranches,
    isRefetching: branchesRefetching,
  } = useBranches();
  const {
    data: codes,
    isLoading: codesLoading,
    refetch: refetchCodes,
    isRefetching: codesRefetching,
  } = useConsumerDiscountCodes();
  const updateProfile = useUpdateProfile();
  const logout = useLogout();

  const [name, setName] = useState(user?.name ?? "");
  const [revealedCodeId, setRevealedCodeId] = useState<string | null>(null);

  const isLoading = userLoading || branchesLoading;
  const isRefetching = userRefetching || branchesRefetching || codesRefetching;

  const handleRefresh = useCallback(() => {
    refetchUser();
    refetchBranches();
    refetchCodes();
  }, [refetchUser, refetchBranches, refetchCodes]);

  if (!user && !userLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState
          title="Sign in to view your account"
          message="Access your profile, preferred branch, and discount codes."
          actionTitle="Sign in"
          onAction={() => router.push("/login")}
        />
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
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          tintColor={theme.gold}
          colors={[theme.gold]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>My Account</Text>
        <TouchableOpacity onPress={logout} style={styles.logout}>
          <LogOut size={20} fill={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <AccountSkeleton />
      ) : (
        <>
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile</Text>
            <Text style={[styles.label, { color: theme.text }]}>Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.muted,
                  color: theme.text,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.textMuted}
            />
            <Button
              title="Save name"
              variant="primary"
              onPress={() =>
                updateProfile.mutate({ name: name.trim() || undefined })
              }
              disabled={
                name.trim() === (user?.name ?? "") || updateProfile.isPending
              }
            />
          </Card>

          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferred Branch</Text>
            {branches?.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillList}
              >
                {branches.map((item) => (
                  <BranchPill
                    key={item.id}
                    name={item.name}
                    selected={user?.preferredBranchId === item.id}
                    onPress={() =>
                      updateProfile.mutate({
                        preferredBranchId:
                          user?.preferredBranchId === item.id ? null : item.id,
                      })
                    }
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.muted, { color: theme.textMuted }]}>No branches available</Text>
            )}
          </Card>

          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>My Discount Codes</Text>
            {codesLoading ? (
              <DiscountCodeListSkeleton count={2} />
            ) : codes?.length ? (
              <View style={styles.codeList}>
                {codes.map((code) => {
                  const isRevealed = revealedCodeId === code.id;
                  const isRedeemed = code.redeemed;

                  return (
                    <TouchableOpacity
                      key={code.id}
                      activeOpacity={0.8}
                      style={[
                        styles.codeRow,
                        isRedeemed && styles.codeRowRedeemed,
                        {
                          backgroundColor: theme.surface,
                          borderColor: theme.muted,
                        },
                      ]}
                      onPress={() =>
                        !isRedeemed && setRevealedCodeId((prev) =>
                          prev === code.id ? null : code.id
                        )
                      }
                    >
                      <View style={styles.codeInfo}>
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
                      <View style={styles.codeActions}>
                        {isRedeemed ? (
                          <Badge label="Redeemed" variant="default" />
                        ) : (
                          <>
                            {isRevealed ? (
                              <EyeOff
                                size={18}
                                fill={theme.textMuted}
                              />
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
              </View>
            ) : (
              <EmptyState
                title="No discount codes"
                message="Check back later for exclusive offers."
              />
            )}
          </Card>
        </>
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
    gap: 24,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  logout: {
    padding: 8,
  },
  card: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    minHeight: 48,
  },
  pillList: {
    gap: 8,
    paddingVertical: 4,
  },
  muted: {
    fontSize: 14,
  },
  codeList: {
    gap: 8,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  codeRowRedeemed: {
    opacity: 0.6,
  },
  codeInfo: {
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
  codeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
