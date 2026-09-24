import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { watchlistsService } from "@/services/watchlists";
import { hasPendingEnrollment } from "@/components/watchlists/utils";
import type { TargetSpecification, TargetUpdate, WatchlistInput, WatchlistUpdate } from "@/components/watchlists/types";

const POLL_INTERVAL_MS = 2500;

export const watchlistKeys = {
  all: ["watchlists"] as const,
  targets: (watchlistId: string) => ["targets", watchlistId] as const,
  batch: (batchId: string) => ["enrollment-batches", batchId] as const,
};

export function useWatchlists() {
  return useQuery({ queryKey: watchlistKeys.all, queryFn: ({ signal }) => watchlistsService.list(signal) });
}

export function useWatchlistTargets(watchlistId: string) {
  return useQuery({
    queryKey: watchlistKeys.targets(watchlistId),
    queryFn: ({ signal }) => watchlistsService.targets(watchlistId, signal),
    enabled: Boolean(watchlistId),
    refetchInterval: (query) => query.state.status !== "error" && query.state.data?.some(hasPendingEnrollment)
      ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });
}

export function useEnrollmentBatch(batchId: string | null) {
  return useQuery({
    queryKey: watchlistKeys.batch(batchId ?? ""),
    queryFn: ({ signal }) => watchlistsService.enrollmentBatch(batchId!, signal),
    enabled: Boolean(batchId),
    refetchInterval: (query) => query.state.status !== "error" && query.state.data?.some(hasPendingEnrollment)
      ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });
}

export function useWatchlistMutations() {
  const client = useQueryClient();
  const invalidate = async () => {
    // Cancel pre-mutation reads so a late response cannot restore removed targets/photos.
    const keys = [["watchlists"], ["targets"], ["enrollment-batches"]];
    await Promise.all(keys.map((queryKey) => client.cancelQueries({ queryKey })));
    await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
  };
  const createWatchlist = useMutation({ mutationFn: (body: WatchlistInput) => watchlistsService.create(body), onSuccess: invalidate });
  const updateWatchlist = useMutation({
    mutationFn: ({ id, body }: { id: string; body: WatchlistUpdate }) => watchlistsService.update(id, body), onSuccess: invalidate,
  });
  const deleteWatchlist = useMutation({ mutationFn: watchlistsService.remove, onSuccess: invalidate });
  const createTargets = useMutation({
    mutationFn: ({ watchlistId, targets, files }: { watchlistId: string; targets: TargetSpecification[]; files: File[] }) =>
      watchlistsService.createTargets(watchlistId, targets, files), onSuccess: invalidate,
  });
  const updateTarget = useMutation({
    mutationFn: ({ watchlistId, targetId, body }: { watchlistId: string; targetId: string; body: TargetUpdate }) =>
      watchlistsService.updateTarget(watchlistId, targetId, body), onSuccess: invalidate,
  });
  const deleteTarget = useMutation({
    mutationFn: ({ watchlistId, targetId }: { watchlistId: string; targetId: string }) =>
      watchlistsService.removeTarget(watchlistId, targetId), onSuccess: invalidate,
  });
  const addPhotos = useMutation({
    mutationFn: ({ watchlistId, targetId, files }: { watchlistId: string; targetId: string; files: File[] }) =>
      watchlistsService.addPhotos(watchlistId, targetId, files), onSuccess: invalidate,
  });
  const deletePhoto = useMutation({
    mutationFn: ({ watchlistId, targetId, imageId }: { watchlistId: string; targetId: string; imageId: string }) =>
      watchlistsService.removePhoto(watchlistId, targetId, imageId), onSuccess: invalidate,
  });
  return { createWatchlist, updateWatchlist, deleteWatchlist, createTargets, updateTarget, deleteTarget, addPhotos, deletePhoto };
}