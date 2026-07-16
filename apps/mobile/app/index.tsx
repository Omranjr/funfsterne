import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import {
  ProductCard,
  BranchPill,
  Button,
  ListSkeleton,
  EmptyState,
  Card,
} from "@/components";
import { useProducts, useBranches, type ProductCategory } from "@/hooks/usePublicData";

const CATEGORIES: { key: ProductCategory; label: string }[] = [
  { key: "HAIR", label: "Hair" },
  { key: "SKIN_CARE", label: "Skin Care" },
  { key: "BEARD", label: "Beard" },
  { key: "TOOLS", label: "Tools" },
  { key: "OTHER", label: "Other" },
];

export default function HomeScreen() {
  const router = useRouter();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const { data: branches, isLoading: branchesLoading } = useBranches();
  const { data: products, isLoading: productsLoading } = useProducts({
    branchId: selectedBranchId ?? undefined,
  });

  const featured = products?.slice(0, 4) ?? [];
  const isLoading = branchesLoading || productsLoading;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>FünfSterne</Text>
        <Text style={styles.subtitle}>Premium barber products</Text>
      </View>

      <Card style={styles.branchCard}>
        <Text style={styles.sectionTitle}>Select Branch</Text>
        {branchesLoading ? (
          <View style={styles.pillRow}>
            <View style={styles.skeletonPill} />
            <View style={styles.skeletonPill} />
            <View style={styles.skeletonPill} />
          </View>
        ) : branches?.length ? (
          <FlatList
            horizontal
            data={branches}
            keyExtractor={(b) => b.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillList}
            renderItem={({ item }) => (
              <BranchPill
                name={item.name}
                selected={selectedBranchId === item.id}
                onPress={() =>
                  setSelectedBranchId((prev) =>
                    prev === item.id ? null : item.id
                  )
                }
              />
            )}
          />
        ) : (
          <Text style={styles.muted}>No branches available</Text>
        )}
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              activeOpacity={0.8}
              style={styles.categoryCard}
              onPress={() =>
                router.push({
                  pathname: "/products",
                  params: { category: cat.key, branchId: selectedBranchId ?? "" },
                })
              }
            >
              <Text style={styles.categoryLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <Button
            title="See all"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/products",
                params: { branchId: selectedBranchId ?? "" },
              })
            }
          />
        </View>

        {isLoading ? (
          <ListSkeleton count={2} />
        ) : featured.length ? (
          <View style={styles.featuredList}>
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                name={product.name}
                description={product.description}
                price={product.basePrice}
                imageUrl={product.images[0]}
                category={product.category}
                onPress={() => router.push(`/products/${product.id}`)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            title="No products yet"
            message="Check back soon for our premium selection."
          />
        )}
      </View>
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
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textMuted,
  },
  section: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  branchCard: {
    gap: theme.spacing.sm,
  },
  pillList: {
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
  muted: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.md,
  },
  categoryCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.muted,
    minHeight: 80,
  },
  categoryLabel: {
    color: theme.colors.text,
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
  },
  featuredList: {
    gap: theme.spacing.md,
  },
});
