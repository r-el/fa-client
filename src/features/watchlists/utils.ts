import axios from "axios";
import type { Metadata, Target } from "./types";

export const MAX_PHOTOS = 20;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validatePhotos(files: readonly File[]): string | undefined {
  if (files.length > MAX_PHOTOS) return `Upload at most ${MAX_PHOTOS} photos per request.`;
  const names = new Set<string>();
  for (const file of files) {
    if (!file.name.trim()) return "Every photo needs a file name.";
    if (names.has(file.name)) return `Duplicate file name: ${file.name}. Rename or remove it.`;
    names.add(file.name);
    if (!PHOTO_TYPES.includes(file.type)) return `${file.name}: use JPEG, PNG or WebP.`;
    if (file.size === 0) return `${file.name} is empty.`;
    if (file.size > MAX_PHOTO_BYTES) return `${file.name} exceeds 10 MiB.`;
  }
}

export function parseMetadata(text: string): Metadata {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Metadata must be a JSON object, for example {}.");
  }
  return value as Metadata;
}

export function hasPendingEnrollment(target: Target): boolean {
  // Partial can include pending work; queued can mean there are no images/modalities at all.
  return target.reference_images.some((image) =>
    image.embeddings.some((embedding) => embedding.status === "pending"),
  );
}

export function watchlistError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body: unknown = error.response?.data;
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      for (const value of [record.message, record.error, record.detail]) {
        if (typeof value === "string") return value;
      }
    }
  }
  return error instanceof Error ? error.message : "The request failed. Please try again.";
}