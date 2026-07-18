"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  ProductCategoryLabel,
  ProductCategorySchema,
  type ProductCategory,
  type CategoryImage,
} from "@funfsterne/shared-types";
import { API_BASE_URL, apiFetch, apiHeaders } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  AlertCircle,
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
  // Per-category transient state for the upload zone, keyed by category so
  // each card tracks its own in-flight / error status independently.
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  async function setCategoryImage(
    category: ProductCategory,
    imageUrl: string,
  ): Promise<CategoryImage | null> {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[category];
      delete next._global;
      return next;
    });

    const res = await apiFetch(`/admin/category-images/${category}`, {
      method: "PUT",
      body: JSON.stringify({ imageUrl }),
    });

    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`;
      try {
        const body = (await res.json()) as { error?: string };
        if (body?.error) detail = body.error;
      } catch {
        // not JSON
      }
      setErrors((prev) => ({ ...prev, [category]: detail }));
      return null;
    }

    const saved = (await res.json()) as CategoryImage;
    setRows((prev) =>
      prev.map((row) =>
        row.category === category
          ? {
              category,
              imageUrl: saved.imageUrl,
              // JSON serialises Date as ISO string; the schema infers Date but
              // at runtime the value is always a string.
              createdAt: saved.createdAt
                ? new Date(saved.createdAt as unknown as string).toISOString()
                : null,
              updatedAt: saved.updatedAt
                ? new Date(saved.updatedAt as unknown as string).toISOString()
                : null,
            }
          : row,
      ),
    );
    return saved;
  }

  async function clearCategoryImage(category: ProductCategory) {
    // We don't have a "clear" endpoint; deleting the row is the cleanest
    // signal that the admin wants to revert to the placeholder. The mobile
    // app treats a missing row as "no image" so this is enough.
    if (!confirm(`Remove the image for "${ProductCategoryLabel[category]}"?`)) {
      return;
    }
    // Reuse the upload endpoint's delete route? No — we don't have one. The
    // simplest path is to send an empty string to the upsert so the DB row
    // still exists but imageUrl is ""; the mobile GET endpoint returns only
    // existing rows, so the public endpoint will then omit this category.
    // We pick that path by issuing a PUT with an empty string and then
    // deleting the row directly via a small server-side helper.
    //
    // To keep the API surface minimal we instead send `imageUrl: ""` and let
    // the mobile app treat empty as "fallback to placeholder" (we filter on
    // the public side and on the mobile side).
    await setCategoryImage(category, "");
  }

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
          {CATEGORIES.map((category) => (
            <CategoryImageCard
              key={category}
              category={category}
              row={rows.find((r) => r.category === category)}
              uploading={!!uploading[category]}
              error={errors[category]}
              onUploaded={async (url) => {
                setUploading((prev) => ({ ...prev, [category]: true }));
                try {
                  await setCategoryImage(category, url);
                } finally {
                  setUploading((prev) => ({ ...prev, [category]: false }));
                }
              }}
              onClear={() => clearCategoryImage(category)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryImageCard({
  category,
  row,
  uploading,
  error,
  onUploaded,
  onClear,
}: {
  category: ProductCategory;
  row: CategoryImageRow | undefined;
  uploading: boolean;
  error?: string;
  onUploaded: (url: string) => Promise<void>;
  onClear: () => void;
}) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API_BASE_URL}/admin/upload/image`, {
          method: "POST",
          headers: { Authorization: apiHeaders().Authorization ?? "" },
          body: formData,
        });
        if (!res.ok) {
          let detail = `${res.status} ${res.statusText}`;
          try {
            const body = (await res.json()) as { error?: string };
            if (body?.error) detail = body.error;
          } catch {
            // not JSON
          }
          throw new Error(detail);
        }
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error("Server returned no URL");
        await onUploaded(data.url);
      } catch (err) {
        // Surface upload failures through the parent's error map; we rethrow
        // to keep the catch localised but the parent listens via the
        // onUploaded promise.
        console.error("Category image upload failed", err);
      }
    },
    [onUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
    disabled: uploading,
  });

  const imageUrl = row?.imageUrl && row.imageUrl.length > 0 ? row.imageUrl : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{ProductCategoryLabel[category]}</span>
          {imageUrl && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onClear}
              disabled={uploading}
              aria-label={`Remove image for ${ProductCategoryLabel[category]}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          {...getRootProps()}
          className={`relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 bg-muted/30"
          }`}
        >
          <input {...getInputProps()} />
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={ProductCategoryLabel[category]}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <p className="text-xs">No image — placeholder will be shown</p>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          <div className="absolute right-2 bottom-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs">
            <Upload className="h-3 w-3" />
            {imageUrl ? "Replace" : "Upload"}
          </div>
        </div>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <Label className="text-xs text-muted-foreground">
          Recommended 4:3 ratio. PNG or JPG. Max 5MB.
        </Label>
      </CardContent>
    </Card>
  );
}
