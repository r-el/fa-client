import { beforeEach, describe, expect, it, vi } from "vitest";
import { showAlertToast, type AlertNotification } from "../notificationToast";

import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

function buildAlert(overrides: Partial<AlertNotification> = {}): AlertNotification {
  return {
    kind: "alert",
    alertId: "message_abc123",
    alertKind: "identity_match",
    cameraId: "camera_001",
    cameraName: "Front Door",
    targetId: "target_001",
    targetLabel: "Target Ariel",
    watchlistName: "Security Targets",
    watchlistKind: "watchlist",
    similarity: 0.85,
    ruleKind: null,
    objectClass: "person",
    level: "warning",
    snapshotUrl: "/api/alerts/message_abc123/snapshot",
    timestamp: "2026-09-28T17:38:30Z",
    ...overrides,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("showAlertToast", () => {
  it("shows a warning toast for a regular watchlist identity match", () => {
    showAlertToast(buildAlert());
    expect(toast.warning).toHaveBeenCalledOnce();
    const [title, options] = vi.mocked(toast.warning).mock.calls[0] as unknown as [
      string,
      { description: string; action: { label: string } },
    ];
    expect(title).toBe("Identity Match — Front Door");
    expect(options.description).toContain("Target Ariel");
    expect(options.description).toContain("85%");
    expect(options.description).toContain("Security Targets");
    expect(options.action.label).toBe("View Alert");
  });

  it("shows an error toast for a blacklist match (critical level)", () => {
    showAlertToast(buildAlert({ level: "critical", watchlistKind: "blacklist" }));
    expect(toast.error).toHaveBeenCalledOnce();
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("shows an info toast for info-level alerts", () => {
    showAlertToast(buildAlert({ level: "info" }));
    expect(toast.info).toHaveBeenCalledOnce();
  });

  it("formats rule alerts with the rule kind in the title", () => {
    showAlertToast(buildAlert({
      alertKind: "rule", ruleKind: "line_crossing",
      targetLabel: null, similarity: null,
    }));
    const [title] = vi.mocked(toast.warning).mock.calls[0] as [string];
    expect(title).toBe("Line Crossing — Front Door");
  });

  it("handles missing camera name and target label gracefully", () => {
    showAlertToast(buildAlert({ cameraName: null, targetLabel: null, similarity: null }));
    const [title, options] = vi.mocked(toast.warning).mock.calls[0] as unknown as [
      string,
      { description: string },
    ];
    expect(title).toBe("Identity Match — Camera");
    expect(options.description).toContain("Unknown");
  });
});
