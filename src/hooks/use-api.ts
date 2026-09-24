import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import type { CameraDetails } from "@/features/cameras/api/cameras";
// ===== CAMERAS =====

export type CameraSummary = CameraDetails;

const fetchCameras = async (signal: AbortSignal): Promise<CameraSummary[]> => {
  const { data } = await api.get("/cameras", { signal });
  if (!data.success || !Array.isArray(data.data)) throw new Error("Invalid camera response.");
  return data.data;
};

export const useGetCameras = () => {
  return useQuery({
    queryKey: ["cameras"],
    queryFn: ({ signal }) => fetchCameras(signal),
    staleTime: 10_000,
    // Also reconcile changes if Socket.IO is unavailable; never poll hidden tabs.
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
};
