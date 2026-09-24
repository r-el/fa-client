import api from "@/services/api";
import { validatePhotos } from "@/components/watchlists/utils";
import type {
  CreatedTargets, Target, TargetSpecification, TargetUpdate,
  Watchlist, WatchlistInput, WatchlistUpdate,
} from "@/components/watchlists/types";

interface ApiResponse<T> { success: boolean; data: T; message?: string; error?: string }

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.error || response.message || "Request failed.");
  return response.data;
}

const watchlistPath = (id: string) => `/watchlists/${encodeURIComponent(id)}`;
const targetPath = (watchlistId: string, targetId: string) =>
  `${watchlistPath(watchlistId)}/targets/${encodeURIComponent(targetId)}`;

export function buildPhotoForm(files: File[], targets?: TargetSpecification[]): FormData {
  const error = validatePhotos(files);
  if (error) throw new Error(error);
  if (targets) {
    if (!targets.length || targets.some((target) => !target.label.trim())) {
      throw new Error("Every target needs a label.");
    }
    const names = targets.flatMap((target) => target.image_file_names).sort();
    const uploads = files.map((file) => file.name).sort();
    if (names.length !== uploads.length || names.some((name, index) => name !== uploads[index])) {
      throw new Error("Every uploaded photo must be named by exactly one target.");
    }
  } else if (!files.length) {
    throw new Error("Select at least one photo.");
  }
  const form = new FormData();
  if (targets) form.append("targets", JSON.stringify(targets));
  files.forEach((file) => form.append("images", file, file.name));
  return form;
}

export function normalizeCreatedTargets(value: Target[] | CreatedTargets): CreatedTargets {
  // Current checked-in Specter returns an array. Also accept a batch envelope when deployed.
  return Array.isArray(value)
    ? { enrollment_batch_id: value[0]?.enrollment_batch_id ?? null, targets: value }
    : value;
}

export const watchlistsService = {
  async list(signal?: AbortSignal): Promise<Watchlist[]> {
    return unwrap((await api.get<ApiResponse<Watchlist[]>>("/watchlists", { signal })).data);
  },
  async create(body: WatchlistInput): Promise<Watchlist> {
    return unwrap((await api.post<ApiResponse<Watchlist>>("/watchlists", body)).data);
  },
  async update(id: string, body: WatchlistUpdate): Promise<Watchlist> {
    return unwrap((await api.patch<ApiResponse<Watchlist>>(watchlistPath(id), body)).data);
  },
  async remove(id: string): Promise<void> {
    unwrap((await api.delete<ApiResponse<void>>(watchlistPath(id))).data);
  },
  async targets(watchlistId: string, signal?: AbortSignal): Promise<Target[]> {
    return unwrap((await api.get<ApiResponse<Target[]>>(`${watchlistPath(watchlistId)}/targets`, { signal })).data);
  },
  async createTargets(watchlistId: string, targets: TargetSpecification[], files: File[]): Promise<CreatedTargets> {
    const response = await api.post<ApiResponse<Target[] | CreatedTargets>>(
      `${watchlistPath(watchlistId)}/targets`, buildPhotoForm(files, targets),
      // Remove the shared JSON default: the browser must generate the multipart boundary.
      { headers: { "Content-Type": undefined } },
    );
    return normalizeCreatedTargets(unwrap(response.data));
  },
  async updateTarget(watchlistId: string, targetId: string, body: TargetUpdate): Promise<Target> {
    return unwrap((await api.patch<ApiResponse<Target>>(targetPath(watchlistId, targetId), body)).data);
  },
  async removeTarget(watchlistId: string, targetId: string): Promise<void> {
    unwrap((await api.delete<ApiResponse<void>>(targetPath(watchlistId, targetId))).data);
  },
  async addPhotos(watchlistId: string, targetId: string, files: File[]): Promise<Target> {
    return unwrap((await api.post<ApiResponse<Target>>(
      `${targetPath(watchlistId, targetId)}/images`, buildPhotoForm(files),
      { headers: { "Content-Type": undefined } },
    )).data);
  },
  async removePhoto(watchlistId: string, targetId: string, imageId: string): Promise<void> {
    unwrap((await api.delete<ApiResponse<void>>(
      `${targetPath(watchlistId, targetId)}/images/${encodeURIComponent(imageId)}`,
    )).data);
  },
  async photo(watchlistId: string, targetId: string, imageId: string, signal?: AbortSignal): Promise<Blob> {
    const { data } = await api.get<Blob>(
      `${targetPath(watchlistId, targetId)}/images/${encodeURIComponent(imageId)}`,
      { responseType: "blob", signal },
    );
    return data;
  },
  async enrollmentBatch(batchId: string, signal?: AbortSignal): Promise<Target[]> {
    return unwrap((await api.get<ApiResponse<Target[]>>(
      `/enrollment-batches/${encodeURIComponent(batchId)}`, { signal },
    )).data);
  },
};