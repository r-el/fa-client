import { parseMetadata, validatePhotos } from "@/features/watchlists/utils";
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
  const trimmedName = values.name.trim();
  if (!trimmedName) {
    throw new Error("A watchlist name is required.");
  }

  const faceRatio = Number(values.face);
  const appRatio = Number(values.appearance);

  if (
    !values.face.trim() ||
    !values.appearance.trim() ||
    !Number.isFinite(faceRatio) ||
    !Number.isFinite(appRatio) ||
    faceRatio < 0 ||
    faceRatio > 1 ||
    appRatio < 0 ||
    appRatio > 1
  ) {
    throw new Error("Match thresholds must be numbers between 0 and 1.");
  }

  return {
    name: trimmedName,
    target_type: values.targetType,
    kind: values.kind,
    face_match_threshold_ratio: faceRatio,
    appearance_match_threshold_ratio: appRatio,
    metadata: parseMetadata(values.metadata),
  };
}

export function validateTargetForm(values: TargetFormValues): {
  update: TargetUpdate;
  specification: TargetSpecification;
} {
  const trimmedLabel = values.label.trim();
  if (!trimmedLabel) {
    throw new Error("A target label is required.");
  }

  const photoError = validatePhotos(values.files);
  if (photoError) {
    throw new Error(photoError);
  }

  const base = {
    label: trimmedLabel,
    metadata: parseMetadata(values.metadata),
  };

  return {
    update: { ...base, is_enabled: values.enabled },
    specification: { ...base, image_file_names: values.files.map((file) => file.name) },
  };
}
