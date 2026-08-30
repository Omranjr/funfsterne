import { useState, useCallback, useEffect } from "react";
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
import { type ProductCategory, type Product } from "@funfsterne/shared-types";

const CATEGORY_KEYS = ["ALL", "HAIR", "SKIN_CARE", "BEARD", "TOOLS", "OTHER"] as const;

type ViewMode = "grid" | "list";

type CategoryFilter = ProductCategory | "ALL";

/**
 * Coerces a category that arrived over the wire into one we actually have.
 *
 * These values come from route params, which a deep link
 * (`funfsterne://products?category=…`) can set to anything at all. Anything
 * unrecognised falls back to "ALL" rather than being passed through to the
 * API as a filter that matches nothing.
 */
function toCategoryFilter(value: string | undefined): CategoryFilter {
  return value !== undefined &&
    (CATEGORY_KEYS as readonly string[]).includes(value)
    ? (value as CategoryFilter)
    : "ALL";
}

export default function ProductsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    branchId?: string;
    nav?: string;
  }>();
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [category, setCategory] = useState<CategoryFilter>(() =>
    toCategoryFilter(params.category)
  );
  const [branchId, setBranchId] = useState<string | null>(
    params.branchId || null
  );

  // Home navigates here with a category (and branch) to filter by. This is a
  // tab route, so the screen stays mounted after its first visit and the
  // useState initialisers above run exactly once -- every later arrival from
  // Home changed the route params and nothing else, leaving whatever filter
  // was already set. Home stamps each navigation with a `nav` nonce so two
  // taps on the same tile are still distinct, which is what makes this
  // effect fire every time rather than only when the value changes.
  const navToken = params.nav;
  useEffect(() => {
    if (navToken === undefined) return;
    setCategory(toCategoryFilter(params.category));
    setBranchId(params.branchId || null);
    // Only `navToken` belongs in the dependency list: it changes on every
    // navigation, and reacting to the other two as well would re-apply the
    // incoming filter on unrelated re-renders and fight the customer's own
    // selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navToken]);

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
  // Screen padding (16 each side) plus the 16 gap between the two columns.
  const cardWidth = viewMode === "grid" ? (width - 48) / 2 : undefined;

  const hasActiveFilter = category !== "ALL" || branchId !== null;

  const clearFilters = useCallback(() => {
    setCategory("ALL");
    setBranchId(null);
  }, []);

  // Stable across renders so FlatList can reuse its cells. Inline, these were
  // new functions on every render of this screen -- which happens on each
  // filter tap and each background refetch -- defeating the list's own
  // memoisation and re-rendering every visible card.
  const keyExtractor = useCallback((item: Product) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View
        style={
          viewMode === "grid"
            ? [styles.gridItem, { width: cardWidth }]
            : styles.listItem
        }
      >
        <ProductCard
          style={viewMode === "grid" ? styles.gridCard : undefined}
          name={item.name}
          description={item.description}
          price={item.basePrice}
          imageUrl={item.images[0]}
          category={t(`categories.${item.category}`)}
          variant={viewMode === "grid" ? "grid" : "row"}
          onPress={() => router.push(`/products/${item.id}`)}
        />
      </View>
    ),
    [viewMode, cardWidth, t, router]
  );

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
              color={
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
              color={
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
              onPress={() => setCategory(key)}
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
          keyExtractor={keyExtractor}
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
          renderItem={renderItem}
        />
      ) : (
        // Offering "clear filters" when none are set sends the customer
        // after a control that would change nothing; an empty catalogue is a
        // different situation from an over-filtered one.
        <EmptyState
          title={t("products.emptyTitle")}
          message={t("products.emptyMessage")}
          actionTitle={hasActiveFilter ? t("products.clearFilters") : undefined}
          onAction={hasActiveFilter ? clearFilters : undefined}
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
    // `stretch` is the default, but it is stated here because the whole
    // point of the row is that both cells take the taller sibling's height.
    alignItems: "stretch",
    gap: 16,
  },
  // The cell stretches to the row height; the card fills the cell. Without
  // the second half, a one-line product sat in a short card beside a
  // two-line one and the grid looked ragged.
  gridItem: {
    alignSelf: "stretch",
  },
  gridCard: {
    flex: 1,
  },
  listItem: {
    flex: 1,
  },
});
