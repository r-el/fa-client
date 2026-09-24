import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { useAuth } from "@/context/AuthContext";
import type { CameraDetails, CameraStatus } from "@/features/cameras/api/cameras";

type Notification =
  | { kind: "camera_status"; cameraId: string; status: CameraStatus; timestamp: string }
  | { kind: "alert" | "enrollment" | "configuration_changed" | "system" };

/** One authenticated connection for the shell; the server assigns authorized camera rooms. */
export function RealtimeSync() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let alertTimer: ReturnType<typeof setTimeout> | undefined;
    const pending = new Set<string>();
    const latestStatus = new Map<string, string>();
    const refresh = (...keys: string[]) => {
      keys.forEach((key) => pending.add(key));
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        if (!disposed) pending.forEach((key) => void queryClient.invalidateQueries({ queryKey: [key] }));
        pending.clear();
      }, 250);
    };
    const socket = io(import.meta.env.VITE_API_BASE_URL || window.location.origin, {
      auth: (callback) => callback({ token: localStorage.getItem("token") ?? "" }),
      autoConnect: false,
    });
    socket.on("connect", () => {
      setConnected(true);
      // Missed notifications are not history: reconcile from Specter after reconnecting.
      refresh("cameras", "alerts", "dashboard", "watchlists", "targets", "enrollment-batches");
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on("notification", (event: Notification) => {
      if (!event || disposed) return;
      switch (event.kind) {
        case "camera_status": {
          if ((latestStatus.get(event.cameraId) ?? "") > event.timestamp) return;
          latestStatus.set(event.cameraId, event.timestamp);
          queryClient.setQueryData<CameraDetails[]>(["cameras"], (cameras) => cameras?.map((camera) =>
            camera.id === event.cameraId ? { ...camera, live_status: event.status } : camera));
          refresh("cameras", "dashboard");
          break;
        }
        case "alert":
          refresh("alerts", "dashboard");
          // The recorder can persist just after notification delivery. Re-read once, coalesced.
          if (!alertTimer) alertTimer = setTimeout(() => {
            alertTimer = undefined;
            refresh("alerts", "dashboard");
          }, 1500);
          break;
        case "enrollment": refresh("targets", "enrollment-batches"); break;
        case "configuration_changed":
          refresh("cameras", "alerts", "dashboard", "watchlists", "targets", "enrollment-batches");
          break;
      }
    });
    socket.connect();
    return () => {
      disposed = true;
      clearTimeout(refreshTimer);
      clearTimeout(alertTimer);
      socket.removeAllListeners();
      socket.disconnect();
      setConnected(false);
    };
  }, [isAuthenticated, user?.id, queryClient]);

  if (!isAuthenticated) return null;
  return <p role="status" className={`text-xs ${connected ? "text-emerald-400" : "text-amber-400"}`}>
    {connected ? "Live updates connected" : "Live updates disconnected — camera polling and manual refresh remain available."}
  </p>;
}