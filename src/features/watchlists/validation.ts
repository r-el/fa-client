import { targetFormSchema, watchlistFormSchema } from "./schemas";
import type {
  TargetSpecification,
  TargetType,
  TargetUpdate,
  WatchlistInput,
  WatchlistKind,
} from "@/features/watchlists/types";

export interface WatchlistFormValues {
  name: string;
  targetType: TargetType;
  kind: WatchlistKind;
  face: string;
  appearance: string;
  metadata: string;
}

export interface TargetFormValues {
  label: string;
  metadata: string;
  enabled: boolean;
  files: File[];
}

export function validateWatchlistForm(values: WatchlistFormValues): WatchlistInput {
  const result = watchlistFormSchema.safeParse(values);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid watchlist data.");
  }

  return {
    name: result.data.name,
    target_type: result.data.targetType,
    kind: result.data.kind,
    face_match_threshold_ratio: Number(result.data.face),
    appearance_match_threshold_ratio: Number(result.data.appearance),
    metadata: result.data.metadata,
  };
}

export function validateTargetForm(values: TargetFormValues): {
  update: TargetUpdate;
  specification: TargetSpecification;
} {
  const result = targetFormSchema.safeParse(values);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Invalid target data.");
  }

  const base = {
    label: result.data.label,
    metadata: result.data.metadata,
  };

  return {
    update: { ...base, is_enabled: result.data.enabled },
    specification: { ...base, image_file_names: values.files.map((file) => file.name) },
  };
}
