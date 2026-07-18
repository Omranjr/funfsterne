import { useQuery } from "@tanstack/react-query";
import { apiFetch, getActiveDiscountCodes } from "@/lib/api";
import {
  type Product,
  type Branch,
  ProductCategorySchema,
} from "@funfsterne/shared-types";
import { z } from "zod";

export type ProductCategory = z.infer<typeof ProductCategorySchema>;

export function useBranches() {
  return useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: () => apiFetch<Branch[]>("/branches"),
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
    queryFn: () => apiFetch<Product[]>(`/products${query ? `?${query}` : ""}`),
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ["product", id],
    queryFn: () => apiFetch<Product>(`/products/${id}`),
    enabled: Boolean(id),
  });
}

export function useDiscountCodes() {
  return useQuery({
    queryKey: ["discount-codes", "active"],
    queryFn: () => getActiveDiscountCodes(),
  });
}
