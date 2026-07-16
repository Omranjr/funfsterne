"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { API_BASE_URL, apiHeaders } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";

export function ImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      const uploaded: string[] = [];

      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_BASE_URL}/admin/upload/image`, {
          method: "POST",
          headers: { Authorization: apiHeaders().Authorization },
          body: formData,
        });

        if (res.ok) {
          const data = (await res.json()) as { url: string };
          uploaded.push(data.url);
        }
      }

      onChange([...images, ...uploaded]);
      setUploading(false);
    },
    [images, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {isDragActive
              ? "Drop images here..."
              : "Drag & drop images, or click to select"}
          </p>
          {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
        </div>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, index) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-md">
              <img
                src={url}
                alt={`Product image ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-0 top-0 h-5 w-5"
                onClick={() => onChange(images.filter((_, i) => i !== index))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
