import { isAxiosError } from "axios";
import api from "@/services/api";

export type CameraStatus = "starting" | "running" | "reconnecting" | "stopped" | "failed";

export interface CameraDetails {
  id: string;
  name: string;
  source_url: string;
  username: string | null;
  has_password: boolean;
  location: string | null;
  created_by: string | null;
  watchlist_ids: string[];
  detection_classes: string[];
  is_enabled: boolean;
  desired_state: "running" | "stopped";
  live_status: CameraStatus | null;
  canManage?: boolean;
}

export interface CameraInput {
  name: string;
  source_url: string;
  location: string;
  watchlist_ids: string[];
  detection_classes: string[];
  credentials?: { username: string; password: string };
}

export type CameraUpdate = Omit<CameraInput, "credentials"> & {
  credentials?: CameraInput["credentials"] | null;
};
export type CameraAction = "start" | "stop";

interface CameraResponse<T> { success: boolean; data: T; message?: string; error?: string }
function unwrap<T>(response: CameraResponse<T>): T {
  if (!response.success) throw new Error(response.error || response.message || "Camera request failed.");
  return response.data;
}

const cameraPath = (id: string) => `/cameras/${encodeURIComponent(id)}`;

export function cameraError(error: unknown): string {
  if (isAxiosError(error)) {
    const body = error.response?.data;
    if (typeof body?.error === "string") return body.error;
    if (typeof body?.message === "string") return body.message;
    if (!error.response) return "Cannot reach the server. Check your connection and retry.";
  }
  return error instanceof Error ? error.message : "Camera request failed. Please retry.";
}

export const camerasService = {
  async get(id: string, signal?: AbortSignal): Promise<CameraDetails> {
    return unwrap((await api.get<CameraResponse<CameraDetails>>(cameraPath(id), { signal })).data);
  },
  async create(body: CameraInput): Promise<CameraDetails> {
    return unwrap((await api.post<CameraResponse<CameraDetails>>("/cameras", body)).data);
  },
  async update(id: string, body: CameraUpdate): Promise<CameraDetails> {
    return unwrap((await api.put<CameraResponse<CameraDetails>>(cameraPath(id), body)).data);
  },
  async remove(id: string): Promise<void> {
    unwrap((await api.delete<CameraResponse<void>>(cameraPath(id))).data);
  },
  async control(id: string, action: CameraAction): Promise<void> {
    // A 202 only records intent. Never use its response to overwrite live status.
    unwrap((await api.post<CameraResponse<CameraDetails>>(`${cameraPath(id)}/${action}`)).data);
  },
};