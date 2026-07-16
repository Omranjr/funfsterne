import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Image,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react-native";
import { theme } from "@/constants/theme";
import { Button, Badge, ListSkeleton, EmptyState } from "@/components";
import { useProduct, useBranches } from "@/hooks/usePublicData";
import { type Product } from "@funfsterne/shared-types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function formatPrice(value: number) {
  return `€${value.toFixed(2)}`;
}

function resolveDiscountedPrice(
  product: Product,
  branchId?: string
): { finalPrice: number; hasDiscount: boolean; originalPrice: number } {
  const originalPrice = product.basePrice;

  if (!branchId || !product.availabilities?.length) {
    return { finalPrice: originalPrice, hasDiscount: false, originalPrice };
  }

  const availability = product.availabilities.find(
    (a) => a.branchId === branchId
  );

  if (availability?.priceOverride != null) {
    return {
      finalPrice: availability.priceOverride,
      hasDiscount: availability.priceOverride < originalPrice,
      originalPrice,
    };
  }

  return { finalPrice: originalPrice, hasDiscount: false, originalPrice };
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id, branchId } = useLocalSearchParams<{
    id: string;
    branchId?: string;
  }>();

  const { data: product, isLoading } = useProduct(id);
  const { data: branches } = useBranches();

  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(
    branchId
  );
  const [imageIndex, setImageIndex] = useState(0);

  const selectedBranch = useMemo(
    () => branches?.find((b) => b.id === selectedBranchId),
    [branches, selectedBranchId]
  );

  const pricing = useMemo(() => {
    if (!product) {
      return { finalPrice: 0, hasDiscount: false, originalPrice: 0 };
    }
    return resolveDiscountedPrice(product, selectedBranchId);
  }, [product, selectedBranchId]);

  const availability = useMemo(() => {
    if (!product || !selectedBranchId) return null;
    return (
      product.availabilities?.find((a) => a.branchId === selectedBranchId) ?? null
    );
  }, [product, selectedBranchId]);

  const ctaScale = useSharedValue(1);
  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
  }));

  const handleCtaPressIn = useCallback(() => {
    ctaScale.value = withSpring(0.97, { stiffness: 400, damping: 20 });
  }, [ctaScale]);

  const handleCtaPressOut = useCallback(() => {
    ctaScale.value = withSpring(1, { stiffness: 400, damping: 20 });
  }, [ctaScale]);

  const handleCtaPress = useCallback(() => {
    "worklet";
    runOnJS(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        // ignore
      });
    })();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ListSkeleton count={1} />
      </View>
    );
  }

  if (!product) {
    return (
      <EmptyState
        title="Product not found"
        message="We couldn't find the product you're looking for."
        actionTitle="Back to products"
        onAction={() => router.push("/products")}
      />
    );
  }

  const images = product.images.length ? product.images : [null];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.gallery}>
        <FlatList
          horizontal
          pagingEnabled
          data={images}
          keyExtractor={(_, index) => String(index)}
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const index = Math.round(
              e.nativeEvent.contentOffset.x / SCREEN_WIDTH
            );
            setImageIndex(index);
          }}
          renderItem={({ item }) =>
            item ? (
              <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.image, styles.placeholder]}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )
          }
        />

        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === imageIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.header}>
        <Text style={styles.name}>{product.name}</Text>
        <Badge label={product.category} variant="primary" />
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatPrice(pricing.finalPrice)}</Text>
        {pricing.hasDiscount && (
          <Text style={styles.originalPrice}>
            {formatPrice(pricing.originalPrice)}
          </Text>
        )}
      </View>

      {product.description ? (
        <Text style={styles.description}>{product.description}</Text>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available at</Text>
        <View style={styles.branchList}>
          {branches?.map((branch) => {
            const inStock = product.availabilities?.some(
              (a) => a.branchId === branch.id && a.inStock
            );
            const isSelected = selectedBranchId === branch.id;

            return (
              <TouchableOpacity
                key={branch.id}
                activeOpacity={0.8}
                style={[
                  styles.branchRow,
                  isSelected && styles.branchRowSelected,
                ]}
                onPress={() => setSelectedBranchId(branch.id)}
              >
                <View style={styles.branchInfo}>
                  <Text style={styles.branchName}>{branch.name}</Text>
                  {branch.address ? (
                    <View style={styles.branchMeta}>
                      <MapPin size={12} fill={theme.colors.textMuted} />
                      <Text style={styles.branchAddress}>{branch.address}</Text>
                    </View>
                  ) : null}
                </View>
                <Badge
                  label={inStock ? "In stock" : "Out of stock"}
                  variant={inStock ? "success" : "danger"}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {selectedBranch && (
        <AnimatedTouchable
          activeOpacity={1}
          onPressIn={handleCtaPressIn}
          onPressOut={handleCtaPressOut}
          onPress={handleCtaPress}
          style={[styles.cta, ctaAnimatedStyle]}
        >
          <Button
            title={`View at ${selectedBranch.name}`}
            variant="primary"
            onPress={() => {}}
          />
        </AnimatedTouchable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: theme.spacing.xl,
  },
  gallery: {
    position: "relative",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  placeholder: {
    backgroundColor: theme.colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  dots: {
    position: "absolute",
    bottom: theme.spacing.md,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textMuted,
  },
  dotActive: {
    backgroundColor: theme.colors.primary,
    width: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: theme.colors.text,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  price: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  originalPrice: {
    fontSize: 16,
    color: theme.colors.textMuted,
    textDecorationLine: "line-through",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  section: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  branchList: {
    gap: theme.spacing.sm,
  },
  branchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.muted,
    gap: theme.spacing.sm,
  },
  branchRowSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  branchInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  branchName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
  },
  branchMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  branchAddress: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  cta: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
});
