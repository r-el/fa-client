import { toast } from "sonner";
import { useUiStore } from "@/stores/ui-store";

// -----------------------------------------------------------------------
// Types — match the server's AlertNotification shape (notifications/types.ts)
// -----------------------------------------------------------------------

type NotificationLevel = "critical" | "warning" | "info";
type CameraStatus = "starting" | "running" | "reconnecting" | "stopped" | "failed";

export type AlertNotification = {
  kind: "alert";
  alertId: string;
  alertKind: "identity_match" | "rule";
  cameraId: string;
  cameraName: string | null;
  targetId: string | null;
  targetLabel: string | null;
  watchlistName: string | null;
  watchlistKind: string | null;
  similarity: number | null;
  ruleKind: "zone_occupancy" | "line_crossing" | null;
  objectClass: string;
  level: NotificationLevel;
  snapshotUrl: string | null;
  timestamp: string;
};

export type CameraStatusNotification = {
  kind: "camera_status";
  cameraId: string;
  status: CameraStatus;
  timestamp: string;
};

export type Notification =
  | AlertNotification
  | CameraStatusNotification
  | { kind: "enrollment" | "configuration_changed" | "system" };

// -----------------------------------------------------------------------
// Toast display
// -----------------------------------------------------------------------

const TOAST_DURATION_MS = 8_000;

function formatSimilarity(ratio: number | null): string {
  if (ratio === null) return "";
  return `${Math.round(ratio * 100)}%`;
}

function alertTitle(event: AlertNotification): string {
  if (event.alertKind === "identity_match") {
    return `Identity Match — ${event.cameraName ?? "Camera"}`;
  }
  const ruleLabel = event.ruleKind === "line_crossing" ? "Line Crossing" : "Zone Occupancy";
  return `${ruleLabel} — ${event.cameraName ?? "Camera"}`;
}

function alertDescription(event: AlertNotification): string {
  if (event.alertKind === "identity_match") {
    const label = event.targetLabel ?? "Unknown";
    const modality = event.similarity !== null ? `face, ${formatSimilarity(event.similarity)}` : "";
    const watchlist = event.watchlistName ? `\nWatchlist: ${event.watchlistName}` : "";
    return `${label} identified${modality ? ` (${modality})` : ""}${watchlist}`;
  }
  return `${event.objectClass} detected on ${event.cameraName ?? "camera"}`;
}

type ToastLevel = "error" | "warning" | "info";
const LEVEL_MAP: Record<NotificationLevel, ToastLevel> = {
  critical: "error",
  warning: "warning",
  info: "info",
};

function playNotificationTone(level: NotificationLevel): void {
  if (typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(level === "critical" ? 880 : 587.33, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Autoplay or audio context permission error — safely ignore
  }
}

export function showAlertToast(event: AlertNotification): void {
  if (useUiStore.getState().isSoundEnabled) {
    playNotificationTone(event.level);
  }

  const level = LEVEL_MAP[event.level];
  toast[level](alertTitle(event), {
    description: alertDescription(event),
    duration: TOAST_DURATION_MS,
    action: {
      label: "View Alert",
      onClick: () => {
        window.location.href = "/alerts";
      },
    },
  });
}
