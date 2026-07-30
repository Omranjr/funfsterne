import { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { MapPin } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, EmptyState, BranchPillSkeleton } from "@/components";
import { useBranches } from "@/hooks/usePublicData";

export default function BranchesScreen() {
  const { theme } = useTheme();
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
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text, paddingTop: 12 }]}>Branches</Text>
        <BranchPillSkeleton count={6} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState
          title="Could not load branches"
          message="Check your connection and try again."
          actionTitle="Retry"
          onAction={handleRefresh}
        />
      </View>
    );
  }

  if (!branches?.length) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState
          title="No branches"
          message="We couldn't find any branches right now."
        />
      </View>
    );
  }

  return (
    <FlatList
      data={branches}
      keyExtractor={(b) => b.id}
      contentContainerStyle={[
        styles.content,
        { paddingTop: 12 },
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
        <Text style={[styles.title, { color: theme.text }]}>Our Branches</Text>
      }
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
          {item.address ? (
            <View style={styles.row}>
              <MapPin size={14} fill={theme.textMuted} />
              <Text style={[styles.address, { color: theme.textMuted }]}>{item.address}</Text>
            </View>
          ) : null}
        </Card>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
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
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  card: {
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  address: {
    fontSize: 14,
    flex: 1,
  },
  separator: {
    height: 16,
  },
});
