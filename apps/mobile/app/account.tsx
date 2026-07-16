import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Eye, EyeOff, LogOut } from "lucide-react-native";
import { theme } from "@/constants/theme";
import {
  Button,
  Card,
  Badge,
  ListSkeleton,
  EmptyState,
  BranchPill,
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
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: codes, isLoading: codesLoading } = useConsumerDiscountCodes();
  const updateProfile = useUpdateProfile();
  const logout = useLogout();

  const [name, setName] = useState(user?.name ?? "");
  const [revealedCodeId, setRevealedCodeId] = useState<string | null>(null);

  const isLoading = userLoading || branchesLoading;

  if (!user && !userLoading) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Sign in to view your account"
          message="Access your profile, preferred branch, and discount codes."
          actionTitle="Sign in"
          onAction={() => router.push("/login")}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>My Account</Text>
        <TouchableOpacity onPress={logout} style={styles.logout}>
          <LogOut size={20} fill={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ListSkeleton count={2} />
      ) : (
        <>
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textMuted}
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
            <Text style={styles.sectionTitle}>Preferred Branch</Text>
            {branches?.length ? (
              <FlatList
                horizontal
                data={branches}
                keyExtractor={(b) => b.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillList}
                renderItem={({ item }) => (
                  <BranchPill
                    name={item.name}
                    selected={user?.preferredBranchId === item.id}
                    onPress={() =>
                      updateProfile.mutate({
                        preferredBranchId:
                          user?.preferredBranchId === item.id ? null : item.id,
                      })
                    }
                  />
                )}
              />
            ) : (
              <Text style={styles.muted}>No branches available</Text>
            )}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>My Discount Codes</Text>
            {codesLoading ? (
              <ListSkeleton count={2} />
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
                      ]}
                      onPress={() =>
                        !isRedeemed && setRevealedCodeId((prev) =>
                          prev === code.id ? null : code.id
                        )
                      }
                    >
                      <View style={styles.codeInfo}>
                        <Text style={styles.codeLabel}>
                          {isRevealed ? code.code : "Tap to reveal"}
                        </Text>
                        <Text style={styles.codeValue}>
                          {formatDiscountValue(code.type, code.value)}
                        </Text>
                        {code.expiresAt ? (
                          <Text style={styles.codeExpiry}>
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
                                fill={theme.colors.textMuted}
                              />
                            ) : (
                              <Eye size={18} fill={theme.colors.textMuted} />
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
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
  },
  logout: {
    padding: theme.spacing.sm,
  },
  card: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.muted,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  pillList: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  muted: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  codeList: {
    gap: theme.spacing.sm,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.muted,
    gap: theme.spacing.sm,
  },
  codeRowRedeemed: {
    opacity: 0.6,
  },
  codeInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
  },
  codeExpiry: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  codeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
});
