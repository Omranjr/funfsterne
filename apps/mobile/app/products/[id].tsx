import { useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Share2, MapPin, MessageCircle } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge, CachedImage, ProductDetailSkeleton } from "@/components";
import { useProduct, useBranches } from "@/hooks/usePublicData";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const SHOP_INSTAGRAM = "https://instagram.com/funfsterne";
const SHOP_PHONE = "+492827123456";

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: product,
    isLoading,
    refetch,
    isRefetching,
  } = useProduct(id);
  const { data: branches, refetch: refetchBranches } = useBranches();

  const handleRefresh = useCallback(() => {
    refetch();
    refetchBranches();
  }, [refetch, refetchBranches]);

  const availableBranches = useMemo(() => {
    if (!product?.availabilities || !branches) return [];
    const inStockIds = new Set(
      product.availabilities.filter((a) => a.inStock).map((a) => a.branchId)
    );
    return branches.filter((b) => inStockIds.has(b.id));
  }, [product, branches]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    try {
      await Linking.openURL(SHOP_INSTAGRAM);
    } catch {
      // ignore
    }
  }, [product]);

  const handleContact = useCallback(async () => {
    const url = Platform.select({
      ios: `sms:${SHOP_PHONE}`,
      android: `sms:${SHOP_PHONE}`,
      default: `tel:${SHOP_PHONE}`,
    });
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <ProductDetailSkeleton />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <Text style={[styles.error, { color: theme.text }]} numberOfLines={2}>
          Product not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.iconButton,
            { backgroundColor: theme.border },
          ]}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          style={[
            styles.iconButton,
            { backgroundColor: theme.border },
          ]}
          accessibilityLabel="Share product"
        >
          <Share2 size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
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
        <View style={styles.imageContainer}>
          <CachedImage
            source={product.images[0] ?? null}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            fallbackText="No image yet"
          />
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.name, { color: theme.text }]}
              numberOfLines={3}
            >
              {product.name}
            </Text>
            <Badge
              label={product.category}
              variant="primary"
              style={{ alignSelf: "flex-start" }}
            />
          </View>

          <Text style={[styles.price, { color: theme.gold }]}>
            €{product.basePrice.toFixed(2)}
          </Text>

          {product.description ? (
            <Text style={[styles.description, { color: theme.textMuted }]}>
              {product.description}
            </Text>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Available at
            </Text>
            {availableBranches.length ? (
              <View style={styles.branchList}>
                {availableBranches.map((branch) => (
                  <View
                    key={branch.id}
                    style={[
                      styles.branchChip,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <MapPin size={14} color={theme.gold} />
                    <View style={styles.branchText}>
                      <Text
                        style={[styles.branchName, { color: theme.text }]}
                        numberOfLines={1}
                      >
                        {branch.name}
                      </Text>
                      {branch.address ? (
                        <Text
                          style={[
                            styles.branchAddress,
                            { color: theme.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {branch.address}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.empty, { color: theme.textMuted }]}>
                Currently unavailable — check back soon
              </Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleContact}
            style={[
              styles.cta,
              { backgroundColor: theme.gold },
            ]}
          >
            <MessageCircle size={18} color={theme.background} />
            <Text style={[styles.ctaText, { color: theme.background }]}>
              Ask about this product
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const IMAGE_HEIGHT = SCREEN_HEIGHT * 0.55;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  body: {
    padding: 20,
    gap: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  name: {
    flex: 1,
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    lineHeight: 34,
  },
  price: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
  },
  branchList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  branchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%",
  },
  branchText: {
    gap: 2,
  },
  branchName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  branchAddress: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  empty: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  error: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    textAlign: "center",
    marginTop: 100,
  },
});
