"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ProductCategoryLabel,
  ProductCategorySchema,
  type ProductCategory,
  type CategoryImage,
} from "@funfsterne/shared-types";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploader } from "@/components/image-uploader";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// Local shape returned by the admin GET endpoint: the API fills in nulls for
// categories that don't have a row yet so the UI always has 5 entries to draw.
type CategoryImageRow = {
  category: ProductCategory;
  imageUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const CATEGORIES = ProductCategorySchema.options;

export default function CategoriesPage() {
  const [rows, setRows] = useState<CategoryImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Per-category transient state for the save step (after the upload
  // completes). The upload itself is tracked inside <ImageUploader>.
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedTick, setSavedTick] = useState<Record<string, number>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/category-images");
      if (res.ok) {
        const data = (await res.json()) as CategoryImageRow[];
        setRows(data);
      } else {
        setErrors({
          _global: `Failed to load category images (${res.status})`,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Persist the new image URL for a category. The ImageUploader calls
  // onChange with the new images array; we extract the first element (since
  // each category has at most one image) and PUT it to the API.
  const persistImage = useCallback(
    async (category: ProductCategory, urls: string[]) => {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[category];
        delete next._global;
        return next;
      });
      setSaving((prev) => ({ ...prev, [category]: true }));

      // Empty array means "remove the image" — we send an empty string to the
      // upsert, which the public endpoint treats as "no image" (the mobile
      // app falls back to the gradient placeholder).
      const imageUrl = urls[0] ?? "";

      try {
        const res = await apiFetch(
          `/admin/category-images/${category}`,
          {
            method: "PUT",
            body: JSON.stringify({ imageUrl }),
          },
        );

        if (!res.ok) {
          let detail = `${res.status} ${res.statusText}`;
          try {
            const body = (await res.json()) as { error?: string };
            if (body?.error) detail = body.error;
          } catch {
            // not JSON
          }
          setErrors((prev) => ({ ...prev, [category]: detail }));
          // Reload the row so the UI reverts to the persisted state (otherwise
          // the ImageUploader keeps showing the URL we just optimistically
          // added, but the DB doesn't have it).
          await load();
          return;
        }

        const saved = (await res.json()) as CategoryImage;
        setRows((prev) =>
          prev.map((row) =>
            row.category === category
              ? {
                  category,
                  imageUrl: saved.imageUrl,
                  // JSON serialises Date as ISO string; the schema infers
                  // Date but at runtime the value is always a string.
                  createdAt: saved.createdAt
                    ? new Date(
                        saved.createdAt as unknown as string,
                      ).toISOString()
                    : null,
                  updatedAt: saved.updatedAt
                    ? new Date(
                        saved.updatedAt as unknown as string,
                      ).toISOString()
                    : null,
                }
              : row,
          ),
        );
        setSavedTick((prev) => ({
          ...prev,
          [category]: Date.now(),
        }));
      } finally {
        setSaving((prev) => ({ ...prev, [category]: false }));
      }
    },
    [],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Category Images</h1>
        <p className="text-sm text-muted-foreground">
          The home screen shows one tile per product category. Upload an image
          here to replace the default coloured placeholder. Leave a category
          empty to keep the placeholder.
        </p>
      </div>

      {errors._global && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{errors._global}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading categories…
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => {
            const row = rows.find((r) => r.category === category);
            const currentUrl =
              row?.imageUrl && row.imageUrl.length > 0 ? row.imageUrl : "";
            return (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{ProductCategoryLabel[category]}</span>
                    {saving[category] && (
                      <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Saving…
                      </span>
                    )}
                    {!saving[category] && savedTick[category] && !errors[category] && (
                      <span className="flex items-center gap-1 text-xs font-normal text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Saved
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ImageUploader
                    images={currentUrl ? [currentUrl] : []}
                    onChange={(urls) => persistImage(category, urls)}
                  />
                  {errors[category] && (
                    <p className="text-xs text-destructive">
                      {errors[category]}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
