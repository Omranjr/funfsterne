"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { API_BASE_URL, apiHeaders } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

type FileStatus = {
  id: string;
  name: string;
  status: "uploading" | "uploaded" | "error";
  url?: string;
  error?: string;
};

export function ImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  // We track in-flight + recently-failed files locally so we can show per-file
  // progress. Successfully uploaded files collapse into the `images` prop so
  // they persist with the form state.
  const [inFlight, setInFlight] = useState<FileStatus[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      // Optimistic placeholders so each file gets an immediate row in the UI.
      const placeholders: FileStatus[] = acceptedFiles.map((f) => ({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        status: "uploading",
      }));
      setInFlight((prev) => [...prev, ...placeholders]);
      setErrors([]);

      const uploaded: string[] = [];
      const newErrors: string[] = [];

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const placeholder = placeholders[i];
        if (!file || !placeholder) continue;

        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch(`${API_BASE_URL}/admin/upload/image`, {
            method: "POST",
            headers: { Authorization: apiHeaders().Authorization ?? "" },
            body: formData,
          });

          if (res.ok) {
            const data = (await res.json()) as { url?: string };
            if (data.url) {
              uploaded.push(data.url);
              setInFlight((prev) =>
                prev.map((f) =>
                  f.id === placeholder.id
                    ? { ...f, status: "uploaded", url: data.url }
                    : f,
                ),
              );
            } else {
              throw new Error("Server returned no URL");
            }
          } else {
            let detail = `${res.status} ${res.statusText}`;
            try {
              const body = (await res.json()) as { error?: string };
              if (body?.error) detail = body.error;
            } catch {
              // body wasn't JSON
            }
            throw new Error(detail);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          newErrors.push(`${file.name}: ${message}`);
          setInFlight((prev) =>
            prev.map((f) =>
              f.id === placeholder.id
                ? { ...f, status: "error", error: message }
                : f,
            ),
          );
        }
      }

      if (uploaded.length > 0) {
        onChange([...images, ...uploaded]);
      }
      if (newErrors.length > 0) {
        setErrors(newErrors);
      }

      // Drop the "uploading" rows from the in-flight list; "uploaded" rows
      // stay briefly so the success tick is visible, then clear.
      window.setTimeout(() => {
        setInFlight((prev) => prev.filter((f) => f.status === "uploading"));
      }, 1500);
    },
    [images, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  const removeImage = useCallback(
    (url: string) => {
      onChange(images.filter((u) => u !== url));
    },
    [images, onChange],
  );

  const isUploading = inFlight.some((f) => f.status === "uploading");

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {isUploading
              ? "Uploading…"
              : isDragActive
                ? "Drop images here…"
                : "Drag & drop images, or click to select"}
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <ul className="ml-2 list-disc space-y-1">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {(images.length > 0 || inFlight.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {/* In-flight rows: uploading / uploaded (briefly) / error */}
          {inFlight.map((f) => (
            <div
              key={f.id}
              className="relative h-20 w-20 overflow-hidden rounded-md border bg-muted"
            >
              {f.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.url}
                  alt={f.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  {f.status === "uploading" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : f.status === "error" ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : null}
                </div>
              )}
              {f.status === "uploaded" && (
                <div className="absolute right-0 top-0 rounded-bl-md bg-emerald-500 p-0.5">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              )}
              {f.status === "error" && (
                <div className="absolute right-0 top-0 rounded-bl-md bg-destructive p-0.5">
                  <X className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Persisted images (came from `images` prop) */}
          {images.map((url) => (
            <div
              key={url}
              className="relative h-20 w-20 overflow-hidden rounded-md border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Product image"
                className="h-full w-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-0 top-0 h-5 w-5"
                onClick={() => removeImage(url)}
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
