import { QueryClient } from "@tanstack/react-query";
import type { CameraDetails, CameraInput } from "@/services/cameras";

export const camera: CameraDetails = {
  id: "cam-1", name: "Entrance", source_url: "rtsp://camera.example/stream",
  username: "camera-user", has_password: true, location: "Lobby", created_by: "owner-1",
  watchlist_ids: ["list-1"], detection_classes: ["person"], is_enabled: true,
  desired_state: "stopped", live_status: "stopped", canManage: true,
};

export const cameraInput: CameraInput = {
  name: camera.name, source_url: camera.source_url, location: "Lobby",
  watchlist_ids: ["list-1"], detection_classes: ["person"],
};

export function cameraQueryClient() {
  return new QueryClient({ defaultOptions: {
    queries: { retry: false, gcTime: Infinity }, mutations: { retry: false },
  } });
}