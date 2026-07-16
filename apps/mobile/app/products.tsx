import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Grid3X3, List as ListIcon } from "lucide-react-native";
import { theme } from "@/constants/theme";
import {
  ProductCard,
  BranchPill,
  ListSkeleton,
  EmptyState,
} from "@/components";
import { useProducts, useBranches, type ProductCategory } from "@/hooks/usePublicData";

const CATEGORIES: { key: ProductCategory | "ALL"; label: string }[] = [
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

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [category, setCategory] = useState<ProductCategory | "ALL">(
    (params.category as ProductCategory) ?? "ALL"
  );
  const [branchId, setBranchId] = useState<string | null>(
    params.branchId || null
  );

  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: products, isLoading: productsLoading } = useProducts({
    category: category === "ALL" ? undefined : category,
    branchId: branchId ?? undefined,
  });

  const isLoading = branchesLoading || productsLoading;
  const numColumns = viewMode === "grid" ? 2 : 1;
  const cardWidth = viewMode === "grid" ? (width - 48) / 2 : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === "grid" && styles.toggleActive]}
            onPress={() => setViewMode("grid")}
          >
            <Grid3X3
              size={18}
              fill={
                viewMode === "grid" ? theme.colors.background : theme.colors.text
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === "list" && styles.toggleActive]}
            onPress={() => setViewMode("list")}
          >
            <ListIcon
              size={18}
              fill={
                viewMode === "list" ? theme.colors.background : theme.colors.text
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(c) => c.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <BranchPill
              name={item.label}
              selected={category === item.key}
              onPress={() => setCategory(item.key)}
            />
          )}
        />

        {branchesLoading ? (
          <View style={styles.pillRow}>
            <View style={styles.skeletonPill} />
            <View style={styles.skeletonPill} />
          </View>
        ) : branches?.length ? (
          <FlatList
            horizontal
            data={branches}
            keyExtractor={(b) => b.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => (
              <BranchPill
                name={item.name}
                selected={branchId === item.id}
                onPress={() =>
                  setBranchId((prev) => (prev === item.id ? null : item.id))
                }
              />
            )}
          />
        ) : null}
      </View>

      {isLoading ? (
        <ListSkeleton count={4} />
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
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  toggleButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  toggleActive: {
    backgroundColor: theme.colors.primary,
  },
  filters: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  filterList: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  pillRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  skeletonPill: {
    width: 96,
    height: 36,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.muted,
  },
  list: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  gridRow: {
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  listItem: {
    flex: 1,
  },
});
