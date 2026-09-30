import { z } from "zod";
import { parseMetadata, validatePhotos } from "@/features/watchlists/utils";

export const watchlistFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "A watchlist name is required.")
    .max(100, "Watchlist name cannot exceed 100 characters."),
  targetType: z.enum(["person", "vehicle", "object"] as const),
  kind: z.enum(["watchlist", "blacklist"] as const),
  face: z
    .string()
    .trim()
    .min(1, "Match thresholds must be numbers between 0 and 1.")
    .refine((val) => {
      const num = Number(val);
      return Number.isFinite(num) && num >= 0 && num <= 1;
    }, "Match thresholds must be numbers between 0 and 1."),
  appearance: z
    .string()
    .trim()
    .min(1, "Match thresholds must be numbers between 0 and 1.")
    .refine((val) => {
      const num = Number(val);
      return Number.isFinite(num) && num >= 0 && num <= 1;
    }, "Match thresholds must be numbers between 0 and 1."),
  metadata: z.string().transform((val, ctx) => {
    try {
      return parseMetadata(val);
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (err as Error).message || "Metadata must be a JSON object.",
      });
      return z.NEVER;
    }
  }),
});

export type WatchlistFormSchema = z.infer<typeof watchlistFormSchema>;

export const targetFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "A target label is required.")
    .max(100, "Target label cannot exceed 100 characters."),
  metadata: z.string().transform((val, ctx) => {
    try {
      return parseMetadata(val);
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (err as Error).message || "Metadata must be a JSON object.",
      });
      return z.NEVER;
    }
  }),
  enabled: z.boolean(),
  files: z.array(z.instanceof(File)).superRefine((files, ctx) => {
    const error = validatePhotos(files);
    if (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error,
      });
    }
  }),
});

export type TargetFormSchema = z.infer<typeof targetFormSchema>;
