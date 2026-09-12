import { useState, useCallback, useMemo } from "react";
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useArabicTextStyle } from "@/hooks/useArabicText";
import { PRIVACY_URL } from "@/constants/links";
import { logSwallowed } from "@/lib/log";
import { useTheme } from "@/contexts/ThemeContext";
import {
  typography,
  borderRadius,
  SHARED_TOKENS,
  FONT_SCALE_CAPS,
  HIDE_DECORATION_ABOVE_SCALE,
} from "@/constants/theme";
import {
  ProductCard,
  ListSkeleton,
  EmptyState,
  HeroBanner,
  RewardProgress,
  BranchPicker,
  CachedImage,
  Ground,
  StripePlaceholder,
} from "@/components";
import { useProducts, useBranches, useCategoryImages } from "@/hooks/usePublicData";
import { useLoyaltyMe } from "@/hooks/usePublicData";
import { type ProductCategory, type Branch, type Product } from "@funfsterne/shared-types";


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

/**
 * Category tiles are fixed-size, so their captions had nowhere to go at large
 * system text sizes and truncated -- "Skin Care" became "Hautp...".
 *
 * Growing the tile with the text is the honest fix: the caption gets the room
 * it actually needs instead of an ellipsis. Growth is sublinear and capped,
 * because a tile that scaled 1:1 with a 3x setting would be taller than the
 * screen and the shelf would stop reading as a row of cards.
 */
function scaleTile(base: number, fontScale: number): number {
  const clamped = Math.min(Math.max(fontScale, 1), 2.2);
  // 62% of the extra scale: at the largest system size a tile ends up ~1.74x,
  // which fits three lines of caption without swallowing the screen.
  const growth = 1 + (clamped - 1) * 0.62;
  return Math.round(base * growth);
}


/**
 * Opens the privacy policy, and says so if it cannot.
 *
 * Previously `.catch(() => {})` -- on a device with no browser able to
 * handle the URL the row simply did nothing, which is both confusing and a
 * problem for App Review, since Apple checks this link resolves.
 */
async function openPrivacyPolicy(t: (key: string) => string): Promise<void> {
  try {
    await Linking.openURL(PRIVACY_URL);
  } catch (error) {
    logSwallowed("open-privacy-policy", error);
    Alert.alert(t("common.linkFailed"));
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const arabicText = useArabicTextStyle();
  const { width, fontScale } = useWindowDimensions();
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
          // `nav` is a per-tap nonce: /products is a tab route that stays
          // mounted, so without it a second tap on the same tile carries
          // identical params and the Shop has no way to tell it happened.
          params: {
            category: item.key,
            branchId: selectedBranchId ?? "",
            nav: String(Date.now()),
          },
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

          {/* ── Loyalty progress ───────────────────────────────────── */}
          {/* First thing under the fold line, so it is seen without
              scrolling -- which the hero ring it replaced never managed,
              being a bare number over a portrait. Rendered only when the
              balance has actually loaded: a signed-out visitor gets no
              loyalty data, and an empty card promising rewards they cannot
              collect would be worse than no card. */}
          {loyalty ? (
            <RewardProgress
              points={loyalty.balance}
              onPress={() => router.push("/loyalty")}
            />
          ) : null}

          {/* ── Category shelf ─────────────────────────────────────── */}
          <View style={styles.sectionHead}>
            <Text style={[typography.displayLg, styles.sectionTitle, { color: theme.text }]}>
              {t("home.shopByCategory")}
            </Text>
            {fontScale <= HIDE_DECORATION_ABOVE_SCALE ? (
              <Text
                style={[typography.micro, styles.microUpper, arabicText, { color: theme.goldText }]}
                maxFontSizeMultiplier={FONT_SCALE_CAPS.chrome}
                numberOfLines={1}
              >
                {t("home.swipeHint")}
              </Text>
            ) : null}
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
            <Text style={[typography.displayLg, styles.sectionTitle, { color: theme.text }]}>
              {t("home.featuredProducts")}
            </Text>
            {fontScale <= HIDE_DECORATION_ABOVE_SCALE ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  router.push({
                    pathname: "/products",
                    params: {
                      category: "ALL",
                      branchId: selectedBranchId ?? "",
                      nav: String(Date.now()),
                    },
                  })
                }
              >
                <Text
                  style={[typography.micro, styles.microUpper, arabicText, { color: theme.goldText }]}
                  maxFontSizeMultiplier={FONT_SCALE_CAPS.chrome}
                  numberOfLines={1}
                >
                  {t("home.seeAllShort")}
                </Text>
              </TouchableOpacity>
            ) : null}
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
            onPress={() => { void openPrivacyPolicy(t); }}
            accessibilityRole="button"
            accessibilityLabel={t("home.privacyPolicy")}
            style={styles.privacyLink}
          >
            <Text
              style={[typography.micro, styles.microUpper, arabicText, { color: theme.textMuted }]}
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
  const { fontScale } = useWindowDimensions();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const arabicText = useArabicTextStyle();

  return (
    <View
      style={[
        styles.tile,
        {
          borderColor: theme.hairline,
          // Overrides the base size so the caption has somewhere to go.
          width: scaleTile(CATEGORY_TILE_WIDTH, fontScale),
          height: scaleTile(CATEGORY_TILE_HEIGHT, fontScale),
        },
      ]}
    >
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
          // Three lines, not one. "Skin Care" and "Hautpflege" both fit on a
          // single line at the default size, so nothing changes for most
          // people -- but at large type the label wraps instead of becoming
          // "Hautp...", and the tile has grown to hold it.
          numberOfLines={3}
          // Both levers are needed. The tile grows ~1.74x at most, while the
          // system can ask for 3.12x: three uncapped lines come to 243pt in a
          // 138pt caption, so it would truncate again at the very top sizes.
          // Capped, three lines fit with room to spare.
          maxFontSizeMultiplier={FONT_SCALE_CAPS.chrome}
        >
          {label}
        </Text>
        <Text
          style={[typography.microXs, styles.tileCount, arabicText, { color: theme.gold }]}
          numberOfLines={1}
          // Was allowFontScaling={false}, which froze this at 10pt for
          // everyone -- including the people who turned the setting up
          // precisely because they cannot read 10pt. A cap keeps it inside
          // the tile while still letting it grow.
          maxFontSizeMultiplier={FONT_SCALE_CAPS.chrome}
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
  // The heading must be able to shrink and wrap. Without this it pushed the
  // SWIPE / SEE ALL hint beside it off the row at large type, clipping it to
  // "WIS" -- the row had no give because neither child could yield.
  sectionTitle: {
    flexShrink: 1,
    marginRight: 12,
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
