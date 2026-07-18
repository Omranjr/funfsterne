import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import {
  ProductCard,
  ListSkeleton,
  EmptyState,
  HeroBanner,
  BranchPicker,
  CachedImage,
} from "@/components";
import { useProducts, useBranches, useCategoryImages } from "@/hooks/usePublicData";
import { type ProductCategory, type Branch } from "@funfsterne/shared-types";

const CATEGORIES: {
  key: ProductCategory;
  label: string;
  imageUrl?: string;
}[] = [
  { key: "HAIR", label: "Hair" },
  { key: "SKIN_CARE", label: "Skin Care" },
  { key: "BEARD", label: "Beard" },
  { key: "TOOLS", label: "Tools" },
  { key: "OTHER", label: "Other" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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
    branchId: selectedBranchId ?? undefined,
  });
  const { data: categoryImages } = useCategoryImages();

  const featured = useMemo(() => products?.slice(0, 4) ?? [], [products]);
  const isLoading = branchesLoading || productsLoading;
  const isRefetching = branchesRefetching || productsRefetching;

  const selectedBranch = useMemo(
    () => branches?.find((b) => b.id === selectedBranchId),
    [branches, selectedBranchId]
  );

  const handleRefresh = useCallback(() => {
    refetchBranches();
    refetchProducts();
  }, [refetchBranches, refetchProducts]);

  const handleSelectBranch = useCallback((branch: Branch | null) => {
    setSelectedBranchId(branch?.id ?? null);
  }, []);

  const renderCategory = ({ item }: { item: (typeof CATEGORIES)[0] }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.categoryCard,
        {
          width: (width - 48) / 2,
        },
      ]}
      onPress={() =>
        router.push({
          pathname: "/products",
          params: { category: item.key, branchId: selectedBranchId ?? "" },
        })
      }
    >
      <CachedCategoryImage
        imageUrl={categoryImages?.[item.key]}
        label={item.label}
      />
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
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
      <HeroBanner
        selectedBranch={selectedBranch}
        branches={branches}
        onSelectBranch={handleSelectBranch}
        onOpenBranchPicker={() => setPickerOpen(true)}
      />

      <BranchPicker
        visible={pickerOpen}
        branches={branches}
        selectedBranchId={selectedBranchId}
        onSelect={handleSelectBranch}
        onClose={() => setPickerOpen(false)}
      />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Shop by Category
        </Text>
        <FlatList
          data={CATEGORIES}
          numColumns={2}
          keyExtractor={(c) => c.key}
          scrollEnabled={false}
          contentContainerStyle={styles.categoryGrid}
          columnWrapperStyle={styles.categoryRow}
          renderItem={renderCategory}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Featured Products
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/products",
                params: { branchId: selectedBranchId ?? "" },
              })
            }
          >
            <Text style={[styles.seeAll, { color: theme.gold }]}>See all ›</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ListSkeleton count={4} />
        ) : featured.length ? (
          <FlatList
            data={featured}
            numColumns={2}
            keyExtractor={(p) => p.id}
            scrollEnabled={false}
            contentContainerStyle={styles.featuredList}
            columnWrapperStyle={styles.featuredRow}
            renderItem={({ item }) => (
              <ProductCard
                name={item.name}
                imageUrl={item.images[0] ?? null}
                price={item.basePrice}
                category={item.category}
                onPress={() => router.push(`/products/${item.id}`)}
                style={{
                  width: (width - 48) / 2,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                }}
                imageStyle={{ height: (width - 48) / 2, aspectRatio: 1 }}
              />
            )}
          />
        ) : (
          <EmptyState
            title="Products coming soon"
            message="Check back soon for our premium selection."
          />
        )}
      </View>
    </ScrollView>
  );
}

function CachedCategoryImage({
  imageUrl,
  label,
}: {
  imageUrl?: string;
  label: string;
}) {
  const { theme } = useTheme();

  const placeholderColors: [string, string] =
    theme.mode === "dark" ? ["#3a322a", "#1f1b17"] : ["#e8dfd1", "#d4c7b0"];

  return (
    <View style={styles.categoryTile}>
      {imageUrl ? (
        <CachedImage
          source={imageUrl}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <LinearGradient
          colors={placeholderColors}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0, y: 1 }}
      />

      <Text style={styles.categoryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 28,
    paddingBottom: 40,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
  },
  seeAll: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  categoryGrid: {
    gap: 12,
  },
  categoryRow: {
    justifyContent: "space-between",
    gap: 12,
  },
  categoryCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  categoryTile: {
    width: "100%",
    aspectRatio: 1.4,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 12,
  },
  categoryLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  featuredList: {
    gap: 12,
  },
  featuredRow: {
    justifyContent: "space-between",
    gap: 12,
  },
});
