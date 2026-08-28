import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Grid3X3, List as ListIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius, screenTopPadding } from "@/constants/theme";
import {
  ProductCard,
  BranchPill,
  ListSkeleton,
  BranchPillSkeleton,
  EmptyState,
  Ground,
} from "@/components";
import { useProducts, useBranches } from "@/hooks/usePublicData";
import { type ProductCategory } from "@funfsterne/shared-types";

const CATEGORY_KEYS = ["ALL", "HAIR", "SKIN_CARE", "BEARD", "TOOLS", "OTHER"] as const;

type ViewMode = "grid" | "list";

export default function ProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    branchId?: string;
  }>();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [category, setCategory] = useState<ProductCategory | "ALL">(
    (params.category as ProductCategory | "ALL") ?? "ALL"
  );
  const [branchId, setBranchId] = useState<string | null>(
    params.branchId || null
  );

  const {
    data: branches,
    isLoading: branchesLoading,
    refetch: refetchBranches,
    isRefetching: branchesRefetching,
  } = useBranches();
  const {
    data: products,
    isLoading: productsLoading,
    refetch: refetchProducts,
    isRefetching: productsRefetching,
    error: productsError,
  } = useProducts({
    category: category === "ALL" ? undefined : category,
    branchId: branchId ?? undefined,
  });

  const isLoading = branchesLoading || productsLoading;
  const isRefetching = branchesRefetching || productsRefetching;

  const handleRefresh = useCallback(() => {
    refetchBranches();
    refetchProducts();
  }, [refetchBranches, refetchProducts]);
  const numColumns = viewMode === "grid" ? 2 : 1;
  const cardWidth = viewMode === "grid" ? (width - 48) / 2 : undefined;

  return (
    <Ground style={styles.container}>
      <View style={[styles.header, { paddingTop: screenTopPadding(insets.top) }]}>
        <Text style={[typography.displayLg, { color: theme.text }]}>
          {t("products.title")}
        </Text>
        <View
          style={[
            styles.toggle,
            { backgroundColor: theme.scrim, borderColor: theme.hairline },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === "grid" && { backgroundColor: theme.gold },
            ]}
            onPress={() => setViewMode("grid")}
          >
            <Grid3X3
              size={18}
              fill={
                viewMode === "grid" ? theme.ground : theme.textMuted
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === "list" && { backgroundColor: theme.gold },
            ]}
            onPress={() => setViewMode("list")}
          >
            <ListIcon
              size={18}
              fill={
                viewMode === "list" ? theme.ground : theme.textMuted
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filters}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {CATEGORY_KEYS.map((key) => (
            <BranchPill
              key={key}
              name={t(`categories.${key}`)}
              selected={category === key}
              onPress={() => setCategory(key as ProductCategory | "ALL")}
            />
          ))}
        </ScrollView>

        {branchesLoading ? (
          <BranchPillSkeleton count={4} />
        ) : branches?.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          >
            {branches.map((item) => (
              <BranchPill
                key={item.id}
                name={item.name}
                selected={branchId === item.id}
                onPress={() =>
                  setBranchId((prev) => (prev === item.id ? null : item.id))
                }
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {isLoading ? (
        <ListSkeleton count={viewMode === "grid" ? 4 : 3} />
      ) : productsError && !products?.length ? (
        // A failed background revalidation of cached data still sets
        // `error` even when stale `products` is available -- only show the
        // hard error state when there's genuinely nothing to display.
        <EmptyState
          title={t("products.errorTitle")}
          message={t("products.errorMessage")}
          actionTitle={t("common.retry")}
          onAction={handleRefresh}
        />
      ) : products?.length ? (
        <FlatList
          key={viewMode}
          data={products}
          numColumns={numColumns}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          columnWrapperStyle={
            viewMode === "grid" ? styles.gridRow : undefined
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={theme.gold}
              colors={[theme.gold]}
            />
          }
          renderItem={({ item }) => (
            <View style={viewMode === "grid" ? { width: cardWidth } : styles.listItem}>
              <ProductCard
                name={item.name}
                description={item.description}
                price={item.basePrice}
                imageUrl={item.images[0]}
                category={t(`categories.${item.category}`)}
                variant={viewMode === "grid" ? "grid" : "row"}
                onPress={() => router.push(`/products/${item.id}`)}
              />
            </View>
          )}
        />
      ) : (
        <EmptyState
          title={t("products.emptyTitle")}
          message={t("products.emptyMessage")}
          actionTitle={t("products.clearFilters")}
          onAction={() => {
            setCategory("ALL");
            setBranchId(null);
          }}
        />
      )}
    </Ground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  toggle: {
    flexDirection: "row",
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    padding: 8,
    borderRadius: borderRadius.pill,
  },
  filters: {
    gap: 8,
    marginBottom: 16,
  },
  filterList: {
    gap: 8,
    paddingVertical: 4,
  },

  list: {
    gap: 16,
    paddingBottom: 32,
  },
  gridRow: {
    justifyContent: "space-between",
    gap: 16,
  },
  listItem: {
    flex: 1,
  },
});
