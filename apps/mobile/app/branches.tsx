import { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { MapPin } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, screenTopPadding } from "@/constants/theme";
import { Card, EmptyState, BranchPillSkeleton, Ground } from "@/components";
import { useBranches } from "@/hooks/usePublicData";

export default function BranchesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  // This screen has no navigation header and the root SafeAreaView
  // deliberately does not claim the top edge (so Home's hero can run
  // full-bleed), so the inset has to be applied here or the title sits
  // underneath the status bar.
  const insets = useSafeAreaInsets();
  const {
    data: branches,
    isLoading,
    refetch,
    isRefetching,
    error,
  } = useBranches();

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <Ground style={styles.container}>
        <Text
          style={[
            styles.title,
            { color: theme.text, paddingTop: screenTopPadding(insets.top) },
          ]}
        >
          {t("branches.title")}
        </Text>
        <BranchPillSkeleton count={6} />
      </Ground>
    );
  }

  // A failed background revalidation still sets `error` while the cached
  // list is perfectly good -- every other screen guards this, and without it
  // a pull-to-refresh on a weak connection replaced a working list with a
  // full-screen error.
  if (error && !branches?.length) {
    return (
      <Ground style={styles.container}>
        <EmptyState
          title={t("branches.errorTitle")}
          message={t("branches.errorMessage")}
          actionTitle={t("common.retry")}
          onAction={handleRefresh}
        />
      </Ground>
    );
  }

  if (!branches?.length) {
    return (
      <Ground style={styles.container}>
        <EmptyState
          title={t("branches.emptyTitle")}
          message={t("branches.emptyMessage")}
        />
      </Ground>
    );
  }

  return (
    <Ground style={styles.flex}>
      <FlatList
        data={branches}
        keyExtractor={(b) => b.id}
        contentContainerStyle={[
          styles.content,
          { paddingTop: screenTopPadding(insets.top) },
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
        ListHeaderComponent={
          <Text style={[styles.title, { color: theme.text }]}>{t("branches.ourBranches")}</Text>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
            {item.address ? (
              <View style={styles.row}>
                <MapPin size={14} color={theme.textMuted} />
                <Text style={[styles.address, { color: theme.textMuted }]}>{item.address}</Text>
              </View>
            ) : null}
          </Card>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </Ground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 24,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    ...typography.displayLg,
    marginBottom: 8,
  },
  card: {
    gap: 4,
  },
  name: {
    ...typography.displayMd,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  address: {
    ...typography.bodyMd,
    flex: 1,
  },
  separator: {
    height: 16,
  },
});
