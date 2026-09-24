export type TargetType = "person" | "vehicle" | "object";
export type WatchlistKind = "watchlist" | "blacklist";
export type EnrollmentStatus = "queued" | "partial" | "ready" | "failed";
export type Metadata = Record<string, unknown>;

export interface WatchlistInput {
  name: string;
  target_type: TargetType;
  kind: WatchlistKind;
  face_match_threshold_ratio: number;
  appearance_match_threshold_ratio: number;
  metadata: Metadata;
}

export interface Watchlist extends WatchlistInput {
  id: string;
  owner_id: string;
}

export type WatchlistUpdate = Partial<Omit<WatchlistInput, "target_type">>;

export interface ReferenceImage {
  id: string;
  embeddings: {
    modality: "face" | "appearance";
    status: "pending" | "embedded" | "rejected";
    rejection_reason: string | null;
    quality_score_ratio: number | null;
  }[];
}

export interface Target {
  id: string;
  watchlist_id: string;
  label: string;
  target_type: TargetType;
  is_enabled: boolean;
  metadata: Metadata;
  enrollment_batch_id: string | null;
  enrollment_status: EnrollmentStatus;
  reference_images: ReferenceImage[];
}

export interface TargetSpecification {
  label: string;
  metadata: Metadata;
  image_file_names: string[];
}

export interface TargetUpdate {
  label: string;
  metadata: Metadata;
  is_enabled: boolean;
}

export interface CreatedTargets {
  enrollment_batch_id: string | null;
  targets: Target[];
}