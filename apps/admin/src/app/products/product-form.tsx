"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreateProductSchema,
  ProductCategorySchema,
  type Product,
  type ProductBranchAvailability,
} from "@funfsterne/shared-types";
import { ImageUploader } from "@/components/image-uploader";

const categories = ProductCategorySchema.options;

type Branch = {
  id: string;
  name: string;
};

export function ProductForm({
  product,
  onSaved,
  onCancel,
}: {
  product: Product | null;
  onSaved: (product: Product) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? categories[0]);
  const [basePrice, setBasePrice] = useState(
    product?.basePrice?.toString() ?? "",
  );
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [availability, setAvailability] = useState<
    Record<
      string,
      { inStock: boolean; priceOverride: string }
    >
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBranches() {
      const res = await apiFetch("/admin/branches");
      if (res.ok) {
        const data = (await res.json()) as Branch[];
        setBranches(data);
      } else {
        toast.error(t("products.couldNotLoadBranches"));
      }
    }
    loadBranches();
  }, [t]);

  // Seeds one availability entry per branch as soon as branches load --
  // for a branch the product already has a row for, that row's real values;
  // otherwise `inStock: true`, matching what every branch's toggle already
  // rendered as (`?? true` below). Without this, a new product left
  // untouched submitted with an EMPTY availability map, so the submit loop
  // (which only PUTs entries that exist in the map) sent zero availability
  // rows -- the product looked "in stock" in this form but was actually
  // unavailable at every branch on the mobile app, since the public API
  // treats "no availability row" as "not carried here", not "available
  // everywhere by default".
  useEffect(() => {
    if (branches.length === 0) return;
    setAvailability((prev) => {
      const next = { ...prev };
      for (const branch of branches) {
        if (next[branch.id]) continue;
        const existing = (
          product?.availabilities as ProductBranchAvailability[] | undefined
        )?.find((a) => a.branchId === branch.id);
        next[branch.id] = existing
          ? {
              inStock: existing.inStock,
              priceOverride: existing.priceOverride?.toString() ?? "",
            }
          : { inStock: true, priceOverride: "" };
      }
      return next;
    });
  }, [branches, product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const parse = CreateProductSchema.safeParse({
      name,
      description: description || undefined,
      category,
      basePrice: Number(basePrice),
      images,
      isActive,
    });

    if (!parse.success) {
      setError(t("common.checkFormValues"));
      setLoading(false);
      return;
    }

    const payload = parse.data;
    const res = product
      ? await apiFetch(`/admin/products/${product.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        })
      : await apiFetch("/admin/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      setError(t("products.failedToSave"));
      setLoading(false);
      return;
    }

    const saved = (await res.json()) as Product;

    const availabilityFailures: string[] = [];
    for (const branchId of Object.keys(availability)) {
      const a = availability[branchId];
      if (!a) continue;
      const availRes = await apiFetch(`/admin/products/${saved.id}/availability`, {
        method: "PUT",
        body: JSON.stringify({
          branchId,
          inStock: a.inStock,
          priceOverride: a.priceOverride ? Number(a.priceOverride) : undefined,
        }),
      });
      if (!availRes.ok) {
        const branchName = branches.find((b) => b.id === branchId)?.name ?? branchId;
        availabilityFailures.push(branchName);
      }
    }
    if (availabilityFailures.length > 0) {
      toast.error(t("products.someAvailabilityFailed"), {
        description: t("products.pleaseRetryFor", { branches: availabilityFailures.join(", ") }),
      });
    }

    const refreshed = await apiFetch(`/admin/products/${saved.id}`);
    if (refreshed.ok) {
      const full = (await refreshed.json()) as Product;
      onSaved(full);
    } else {
      onSaved(saved);
    }

    setLoading(false);
  }

  function updateAvailability(
    branchId: string,
    field: "inStock" | "priceOverride",
    value: boolean | string,
  ) {
    setAvailability((prev) => ({
      ...prev,
      [branchId]: {
        inStock: prev[branchId]?.inStock ?? true,
        priceOverride: prev[branchId]?.priceOverride ?? "",
        [field]: value,
      },
    }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        <Label htmlFor="name">{t("common.name")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("products.description")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">{t("products.category")}</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`productCategories.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="basePrice">{t("products.basePrice")}</Label>
          <Input
            id="basePrice"
            type="number"
            step="0.01"
            min="0"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="isActive"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
        <Label htmlFor="isActive">{t("common.active")}</Label>
      </div>

      <div className="space-y-2">
        <Label>{t("products.images")}</Label>
        <ImageUploader images={images} onChange={setImages} />
      </div>

      <div className="space-y-3">
        <Label>{t("products.branchAvailability")}</Label>
        {branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("products.noBranchesAvailable")}</p>
        ) : (
          <div className="space-y-3">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center"
              >
                <span className="flex-1 text-sm font-medium">{branch.name}</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={availability[branch.id]?.inStock ?? true}
                    onCheckedChange={(v) =>
                      updateAvailability(branch.id, "inStock", v)
                    }
                  />
                  <span className="text-sm text-muted-foreground">{t("products.inStock")}</span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t("products.priceOverride")}
                  value={availability[branch.id]?.priceOverride ?? ""}
                  onChange={(e) =>
                    updateAvailability(branch.id, "priceOverride", e.target.value)
                  }
                  className="sm:w-40"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? t("common.saving")
            : product
              ? t("products.saveChanges")
              : t("products.createProduct")}
        </Button>
      </div>
    </form>
  );
}
