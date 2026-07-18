import { useQuery } from "@tanstack/react-query";
import { apiFetch, getActiveDiscountCodes } from "@/lib/api";
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
