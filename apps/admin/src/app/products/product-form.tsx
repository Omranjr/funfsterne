"use client";

import { useEffect, useState } from "react";
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
      }
    }
    loadBranches();
  }, []);

  useEffect(() => {
    if (product?.availabilities) {
      const map: Record<string, { inStock: boolean; priceOverride: string }> = {};
      for (const a of product.availabilities as ProductBranchAvailability[]) {
        map[a.branchId] = {
          inStock: a.inStock,
          priceOverride: a.priceOverride?.toString() ?? "",
        };
      }
      setAvailability(map);
    }
  }, [product]);

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
      setError("Please check the form values.");
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
      setError("Failed to save product.");
      setLoading(false);
      return;
    }

    const saved = (await res.json()) as Product;

    for (const branchId of Object.keys(availability)) {
      const a = availability[branchId];
      if (!a) continue;
      await apiFetch(`/admin/products/${saved.id}/availability`, {
        method: "PUT",
        body: JSON.stringify({
          branchId,
          inStock: a.inStock,
          priceOverride: a.priceOverride ? Number(a.priceOverride) : undefined,
        }),
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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (€)</Label>
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
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="space-y-2">
        <Label>Images</Label>
        <ImageUploader images={images} onChange={setImages} />
      </div>

      <div className="space-y-3">
        <Label>Branch Availability &amp; Price Overrides</Label>
        {branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No branches available.</p>
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
                  <span className="text-sm text-muted-foreground">In stock</span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price override"
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
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : product ? "Save Changes" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
