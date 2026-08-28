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
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius, SHARED_TOKENS } from "@/constants/theme";
import {
  ProductCard,
  ListSkeleton,
  EmptyState,
  HeroBanner,
  BranchPicker,
  CachedImage,
  Ground,
  StripePlaceholder,
} from "@/components";
import { useProducts, useBranches, useCategoryImages } from "@/hooks/usePublicData";
import { useLoyaltyMe } from "@/hooks/usePublicData";
import { type ProductCategory, type Branch, type Product } from "@funfsterne/shared-types";

const PRIVACY_URL = "https://funfsterne-admin-eight.vercel.app/privacy";

const CATEGORIES: { key: ProductCategory }[] = [
  { key: "HAIR" },
  { key: "SKIN_CARE" },
  { key: "BEARD" },
  { key: "TOOLS" },
  { key: "OTHER" },
];

const HERO_HEIGHT = 400;
const SHEET_OVERLAP = 46;
const CATEGORY_TILE_WIDTH = 134;
const CATEGORY_TILE_HEIGHT = 176;
const GUTTER = 22;

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // The hero is full-bleed under the status bar, so the bar needs light
  // content over the photo -- but once the sheet scrolls up past it the
  // backdrop becomes the ground (cream in light mode), which needs the
  // theme-appropriate style instead.
  const [sheetUnderStatusBar, setSheetUnderStatusBar] = useState(false);

  const {
    data: branches,
    isLoading: branchesLoading,
    refetch: refetchBranches,
    isRefetching: branchesRefetching,
    error: branchesError,
  } = useBranches();
  const {
    data: products,
    isLoading: productsLoading,
    refetch: refetchProducts,
    isRefetching: productsRefetching,
    error: productsError,
  } = useProducts({
    branchId: selectedBranchId ?? undefined,
  });
  const { data: categoryImages } = useCategoryImages();
  const { data: loyalty } = useLoyaltyMe();

  const featured = useMemo(() => products?.slice(0, 4) ?? [], [products]);
  const isLoading = branchesLoading || productsLoading;
  const isRefetching = branchesRefetching || productsRefetching;
  const hasError = Boolean(branchesError || productsError);

  const selectedBranch = useMemo(
    () => branches?.find((b) => b.id === selectedBranchId),
    [branches, selectedBranchId]
  );

  // Per-category product counts for the `N ITEMS` micro label.
  const countsByCategory = useMemo(() => {
    const counts: Partial<Record<ProductCategory, number>> = {};
    for (const p of products ?? []) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const handleRefresh = useCallback(() => {
    refetchBranches();
    refetchProducts();
  }, [refetchBranches, refetchProducts]);

  const handleSelectBranch = useCallback((branch: Branch | null) => {
    setSelectedBranchId(branch?.id ?? null);
  }, []);

  const renderCategory = ({ item }: { item: (typeof CATEGORIES)[0] }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() =>
        router.push({
          pathname: "/products",
          params: { category: item.key, branchId: selectedBranchId ?? "" },
        })
      }
    >
      <CategoryTile
        imageUrl={categoryImages?.[item.key]}
        label={t(`categories.${item.key}`)}
        count={countsByCategory[item.key] ?? 0}
      />
    </TouchableOpacity>
  );

  return (
    <Ground>
      {/* The OS status bar is the only status bar — it floats transparently
          over the hero photo rather than sitting in a bar above it. Light
          content while the photo is behind it; once the sheet has scrolled
          up under the bar, the backdrop is the ground and the theme decides.
          Tab screens stay mounted after their first visit and expo-status-bar
          never restores on unmount, so this hands control back to "auto" the
          moment Home loses focus — otherwise Home's light icons would follow
          the user onto Offers and vanish against the cream ground. */}
      <StatusBar
        style={
          !isFocused
            ? "auto"
            : sheetUnderStatusBar
              ? theme.mode === "dark"
                ? "light"
                : "dark"
              : "light"
        }
        translucent
        backgroundColor="transparent"
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const threshold = HERO_HEIGHT - SHEET_OVERLAP - insets.top;
          const past = y > threshold;
          setSheetUnderStatusBar((prev) => (prev === past ? prev : past));
        }}
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
          loyaltyPoints={loyalty?.balance ?? 0}
          topInset={insets.top}
        />

        {/* The rising sheet: overlaps the hero and carries the page's own
            ground so the transition reads as one continuous surface. It is
            a Ground itself (fill={false} so it sizes to its content inside
            the scroll view), which gives it the same warm wash and grain as
            every other screen rather than a one-off gradient. */}
        <Ground
          fill={false}
          showWashB={false}
          style={[
            styles.sheet,
            { shadowOpacity: theme.mode === "dark" ? 0.6 : 0.12 },
          ]}
        >
          <View style={[styles.sheetHairline, { backgroundColor: theme.hairlineStrong }]} />
          <View style={[styles.grabHandle, { backgroundColor: theme.hairlineStrong }]} />

          {/* ── Category shelf ─────────────────────────────────────── */}
          <View style={styles.sectionHead}>
            <Text style={[typography.displayLg, { color: theme.text }]}>
              {t("home.shopByCategory")}
            </Text>
            <Text
              style={[typography.micro, styles.microUpper, { color: theme.goldText }]}
              allowFontScaling={false}
            >
              {t("home.swipeHint")}
            </Text>
          </View>

          <FlatList
            data={CATEGORIES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(c) => c.key}
            contentContainerStyle={styles.shelf}
            renderItem={renderCategory}
          />

          {/* ── Featured ───────────────────────────────────────────── */}
          <View style={[styles.sectionHead, styles.featuredHead]}>
            <Text style={[typography.displayLg, { color: theme.text }]}>
              {t("home.featuredProducts")}
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
              <Text
                style={[typography.micro, styles.microUpper, { color: theme.goldText }]}
                allowFontScaling={false}
              >
                {t("home.seeAllShort")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.featuredList}>
            {isLoading ? (
              <ListSkeleton count={3} />
            ) : hasError && featured.length === 0 ? (
              // A failed background revalidation of otherwise-cached data still
              // has `error` set even though `featured` has content -- only
              // treat this as a hard error state when there's nothing else to
              // show (e.g. persisted cache is empty on a first-ever launch).
              <EmptyState
                title={t("home.errorTitle")}
                message={t("home.errorMessage")}
              />
            ) : featured.length ? (
              featured.map((item) => (
                <ProductCard
                  key={item.id}
                  name={item.name}
                  description={item.description}
                  price={item.basePrice}
                  imageUrl={item.images[0] ?? null}
                  category={t(`categories.${item.category}`)}
                  stockLabel={stockLabelFor(item, selectedBranchId, t)}
                  onPress={() => router.push(`/products/${item.id}`)}
                />
              ))
            ) : (
              <EmptyState
                title={t("home.emptyTitle")}
                message={t("home.emptyMessage")}
              />
            )}
          </View>

          <TouchableOpacity
            onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
            accessibilityRole="button"
            accessibilityLabel={t("home.privacyPolicy")}
            style={styles.privacyLink}
          >
            <Text
              style={[typography.micro, styles.microUpper, { color: theme.textMuted }]}
              allowFontScaling={false}
            >
              {t("home.privacyPolicy")}
            </Text>
          </TouchableOpacity>
        </Ground>
      </ScrollView>

      <BranchPicker
        visible={pickerOpen}
        branches={branches}
        selectedBranchId={selectedBranchId}
        onSelect={handleSelectBranch}
        onClose={() => setPickerOpen(false)}
      />
    </Ground>
  );
}

/**
 * The micro line beside a featured product's price.
 *
 * Presentational only — it reads the availability data the product already
 * carries. With a branch selected the API has already filtered to in-stock
 * items there, so the label states that; otherwise it reports how many
 * branches stock it.
 */
function stockLabelFor(
  product: Product,
  selectedBranchId: string | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | undefined {
  if (selectedBranchId) return t("products.inStockHere");
  const inStockCount =
    product.availabilities?.filter((a) => a.inStock).length ?? 0;
  if (inStockCount > 0) return t("products.branchCount", { count: inStockCount });
  return undefined;
}

function CategoryTile({
  imageUrl,
  label,
  count,
}: {
  imageUrl?: string;
  label: string;
  count: number;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.tile, { borderColor: theme.hairline }]}>
      {imageUrl ? (
        <CachedImage
          source={imageUrl}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <StripePlaceholder size={14} style={StyleSheet.absoluteFill} />
      )}

      <LinearGradient
        pointerEvents="none"
        colors={[theme.overlayTop, "transparent"]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.38 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.tileCaption}>
        <Text
          style={[typography.displayMd, { color: theme.onImage }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text
          style={[typography.microXs, styles.tileCount, { color: theme.gold }]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {t("home.itemsCount", { count })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  sheet: {
    marginTop: -SHEET_OVERLAP,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    paddingTop: 22,
    overflow: "hidden",
    // Large soft lift so the sheet reads as rising off the hero.
    shadowColor: SHARED_TOKENS.shadow,
    shadowOffset: { width: 0, height: -22 },
    shadowRadius: 44,
    elevation: 18,
  },
  sheetHairline: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  grabHandle: {
    width: 38,
    height: 3,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 24,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: GUTTER,
    paddingBottom: 16,
  },
  featuredHead: {
    paddingTop: 30,
  },
  microUpper: {
    textTransform: "uppercase",
  },
  shelf: {
    paddingHorizontal: GUTTER,
    gap: 12,
  },
  tile: {
    width: CATEGORY_TILE_WIDTH,
    height: CATEGORY_TILE_HEIGHT,
    borderRadius: borderRadius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  tileCaption: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  tileName: {},
  tileCount: {
    marginTop: 5,
    textTransform: "uppercase",
  },
  featuredList: {
    paddingHorizontal: GUTTER,
    gap: 14,
  },
  privacyLink: {
    alignItems: "center",
    paddingVertical: 8,
    marginTop: 30,
  },
});
