import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cameraError, camerasService } from "@/features/cameras/api/cameras";
import type { CameraAction, CameraDetails, CameraInput, CameraUpdate } from "@/features/cameras/api/cameras";

const fetchCameras = async (signal: AbortSignal): Promise<CameraDetails[]> => {
  return camerasService.list(signal);
};

export function useCameras() {
  return useQuery({
    queryKey: ["cameras"],
    queryFn: ({ signal }) => fetchCameras(signal),
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useCameraDetails(id?: string) {
  return useQuery({
    queryKey: ["cameras", "detail", id],
    queryFn: ({ signal }) => camerasService.get(id!, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useCameraMutations() {
  const client = useQueryClient();
  const invalidate = async () => {
    await client.cancelQueries({ queryKey: ["cameras"] });
    await Promise.all([
      client.invalidateQueries({ queryKey: ["cameras"] }),
      client.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };
  const onError = (error: unknown) => toast.error(cameraError(error));
  const create = useMutation({
    mutationFn: (body: CameraInput) => camerasService.create(body),
    onSuccess: async () => { toast.success("Camera created."); await invalidate(); },
    onError,
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CameraUpdate }) => camerasService.update(id, body),
    onSuccess: async () => { toast.success("Camera updated."); await invalidate(); },
    onError,
  });
  const remove = useMutation({
    mutationFn: camerasService.remove,
    onSuccess: async () => { toast.success("Camera deleted."); await invalidate(); },
    onError,
  });
  const control = useMutation({
    mutationFn: ({ id, action }: { id: string; action: CameraAction }) => camerasService.control(id, action),
    onSuccess: async (_, { action }) => {
      toast.success(`Camera ${action} requested. Waiting for reported status.`);
      await invalidate();
    },
    onError,
  });
  return { create, update, remove, control };
}