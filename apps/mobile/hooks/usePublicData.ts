import { useQuery } from "@tanstack/react-query";
import { apiFetch, getActiveDiscountCodes, getLoyaltyMe } from "@/lib/api";
import {
  type Product,
  type Branch,
  type CategoryImage,
  ProductCategorySchema,
} from "@funfsterne/shared-types";
import { z } from "zod";

export type ProductCategory = z.infer<typeof ProductCategorySchema>;

export function useBranches() {
  return useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => apiFetch<Branch[]>("/public/branches"),
  });
}

export function useProducts(options?: {
  category?: ProductCategory;
  branchId?: string;
}) {
  const params = new URLSearchParams();
  if (options?.category) params.set("category", String(options.category));
  if (options?.branchId) params.set("branchId", options.branchId);
  const query = params.toString();

  return useQuery<Product[]>({
    queryKey: ["products", options?.category, options?.branchId],
    queryFn: () =>
      apiFetch<Product[]>(`/public/products${query ? `?${query}` : ""}`),
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ["product", id],
    queryFn: () => apiFetch<Product>(`/public/products/${id}`),
    enabled: Boolean(id),
  });
}

export function useDiscountCodes() {
  return useQuery({
    queryKey: ["discount-codes", "active"],
    queryFn: () => getActiveDiscountCodes(),
  });
}

// Points can change the moment a staff member scans the customer's code on
// a different device, with no push notification to tell this app that
// happened -- so unlike the rest of this file, this is never treated as
// "fresh enough to skip a refetch." Screens using this should also refetch
// on focus/pull-to-refresh; staleTime: 0 only guarantees a mount always hits
// the network, not that it re-runs while already mounted and idle.
export function useLoyaltyMe() {
  return useQuery({
    queryKey: ["loyalty", "me"],
    queryFn: () => getLoyaltyMe(),
    staleTime: 0,
  });
}

// Returns the admin-set images for the home screen category tiles, keyed by
// enum value. Categories with no row (or an empty imageUrl) are simply absent
// from the map — the UI is expected to fall back to its placeholder design.
export function useCategoryImages() {
  return useQuery<Record<ProductCategory, string | undefined>>({
    queryKey: ["category-images"],
    queryFn: async () => {
      const rows = await apiFetch<CategoryImage[]>("/public/category-images");
      const out: Record<string, string | undefined> = {};
      for (const row of rows) {
        if (row.imageUrl && row.imageUrl.length > 0) {
          out[row.category] = row.imageUrl;
        }
      }
      return out as Record<ProductCategory, string | undefined>;
    },
    // Categories change rarely; cache for an hour to avoid refetching on
    // every pull-to-refresh of the home screen.
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Returns true once the queries needed for the first paint of the home
 * screen have resolved (success OR error — a flaky network must not keep
 * the splash pinned forever; the splash's max-wait cap handles that).
 *
 * Calling this hook from the root layout also pre-warms the cache so
 * that when the home screen mounts, its `useBranches()` and
 * `useCategoryImages()` calls resolve instantly from cache.
 */
export function useInitialDataReady(): boolean {
  const branches = useBranches();
  const categories = useCategoryImages();
  return (
    (branches.isSuccess || branches.isError) &&
    (categories.isSuccess || categories.isError)
  );
}
