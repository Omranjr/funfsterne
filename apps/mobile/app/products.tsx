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
import { Grid3X3, List as ListIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ProductCard,
  BranchPill,
  ListSkeleton,
  BranchPillSkeleton,
  EmptyState,
} from "@/components";
import { useProducts, useBranches } from "@/hooks/usePublicData";
import { type ProductCategory } from "@funfsterne/shared-types";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "HAIR", label: "Hair" },
  { key: "SKIN_CARE", label: "Skin Care" },
  { key: "BEARD", label: "Beard" },
  { key: "TOOLS", label: "Tools" },
  { key: "OTHER", label: "Other" },
];

type ViewMode = "grid" | "list";

export default function ProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    branchId?: string;
  }>();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();

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

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Products</Text>
        <View style={[styles.toggle, { backgroundColor: theme.surface }]}>
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
                viewMode === "grid" ? theme.background : theme.text
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
                viewMode === "list" ? theme.background : theme.text
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
          {CATEGORIES.map((item) => (
            <BranchPill
              key={item.key}
              name={item.label}
              selected={category === item.key}
              onPress={() => setCategory(item.key as ProductCategory | "ALL")}
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
                category={item.category}
                onPress={() => router.push(`/products/${item.id}`)}
              />
            </View>
          )}
        />
      ) : (
        <EmptyState
          title="No products found"
          message="Try changing filters or check back later."
          actionTitle="Clear filters"
          onAction={() => {
            setCategory("ALL");
            setBranchId(null);
          }}
        />
      )}
    </View>
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
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  toggle: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 4,
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
