import axios from "axios";
import api from "@/services/api";

export type AlertKind = "identity_match" | "rule";
export type AlertDisposition = "unreviewed" | "true_positive" | "false_positive";
export type AlertResolution = Exclude<AlertDisposition, "unreviewed">;

// Mirrors Specter's AlertResponse plus the names and protected URL added by fa-server.
export interface SpecterAlert {
  id: string;
  kind: AlertKind;
  owner_id: string;
  camera_id: string;
  camera_name: string | null;
  track_id: number;
  object_class: string;
  bounding_box: { x: number; y: number; width: number; height: number };
  frame_captured_at: string;
  created_at: string;
  has_snapshot: boolean;
  snapshot_url: string | null;
  review: { disposition: AlertDisposition; is_acknowledged: boolean; note: string | null };
  watchlist_id: string | null;
  watchlist_name: string | null;
  watchlist_kind: string | null;
  target_id: string | null;
  target_label: string | null;
  modality: "face" | "appearance" | null;
  similarity_ratio: number | null;
  margin_ratio: number | null;
  rule_id: string | null;
  rule_kind: "zone_occupancy" | "line_crossing" | null;
  zone_id: string | null;
  dwell_seconds: number | null;
  crossing_direction: "left_to_right" | "right_to_left" | "either" | null;
}

export interface AlertFilters {
  camera_id?: string[];
  kind?: AlertKind;
  disposition?: AlertDisposition;
  created_since?: string;
  created_until?: string;
  limit?: number;
}

export type AlertSummaryFilters = Pick<AlertFilters, "camera_id" | "created_since" | "created_until">;
export interface AlertPage {
  alerts: SpecterAlert[];
  next_cursor: string | null;
}
export interface AlertSummary {
  total_count: number;
  unacknowledged_count: number;
  counts: { kind: AlertKind; disposition: AlertDisposition; is_acknowledged: boolean; count: number }[];
  daily_counts: { day: string; kind: AlertKind; count: number }[];
}
interface AlertEnvelope<T> { success: true; data: T }

function alertParams(filters: AlertFilters, cursor?: string): URLSearchParams {
  const params = new URLSearchParams();
  filters.camera_id?.forEach((id) => params.append("camera_id", id));
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.disposition) params.set("disposition", filters.disposition);
  if (filters.created_since) params.set("created_since", filters.created_since);
  if (filters.created_until) params.set("created_until", filters.created_until);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (cursor) params.set("cursor", cursor);
  return params;
}

const alertPath = (id: string) => `/alerts/${encodeURIComponent(id)}`;

export async function getAlerts(filters: AlertFilters, cursor?: string, signal?: AbortSignal) {
  const { data } = await api.get<AlertEnvelope<AlertPage>>("/alerts", {
    params: alertParams(filters, cursor), signal,
  });
  return data.data;
}

export async function getAlert(id: string, signal?: AbortSignal) {
  const { data } = await api.get<AlertEnvelope<SpecterAlert>>(alertPath(id), { signal });
  return data.data;
}

export async function getAlertSummary(filters: AlertSummaryFilters, signal?: AbortSignal) {
  const { data } = await api.get<AlertEnvelope<AlertSummary>>("/alerts/summary", {
    params: alertParams(filters), signal,
  });
  return data.data;
}

export async function getAlertSnapshot(id: string, signal?: AbortSignal): Promise<Blob> {
  // Use the authenticated fa API instance, never an <img> request or arbitrary returned URL.
  const { data } = await api.get<Blob>(`${alertPath(id)}/snapshot`, {
    responseType: "blob", headers: { Accept: "image/jpeg" }, signal,
  });
  if (data.type.split(";")[0].toLowerCase() !== "image/jpeg" || data.size === 0) {
    throw new Error("The server did not return a JPEG snapshot.");
  }
  return data;
}

export async function acknowledgeAlert(id: string) {
  const { data } = await api.post<AlertEnvelope<SpecterAlert>>(`${alertPath(id)}/acknowledge`);
  return data.data;
}

export async function resolveAlert(id: string, disposition: AlertResolution, note?: string) {
  if (note && Array.from(note).length > 1000) throw new Error("Notes must be at most 1000 characters.");
  const { data } = await api.post<AlertEnvelope<SpecterAlert>>(`${alertPath(id)}/resolve`, {
    disposition, ...(note?.trim() ? { note: note.trim() } : {}),
  });
  return data.data;
}

export function alertErrorStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function alertErrorMessage(error: unknown): string {
  const status = alertErrorStatus(error);
  if (status === 404) return "Not available yet, removed, or no longer accessible. Try again shortly.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 400 || status === 422) return "The request was rejected. Check the filters or review note.";
  if (status === 429) return "Too many requests. Please try again later.";
  if (status && status >= 500) return "The alerts service is unavailable. Please try again.";
  return error instanceof Error ? error.message : "Unable to load alerts. Please try again.";
}

// Up to three total attempts; never retry authorization or validation failures.
export function retryAlertRead(failureCount: number, error: unknown): boolean {
  const status = alertErrorStatus(error);
  return failureCount < 2 && (status === 404 || (status !== undefined && status >= 500)
    || (axios.isAxiosError(error) && !error.response && !axios.isCancel(error)));
}