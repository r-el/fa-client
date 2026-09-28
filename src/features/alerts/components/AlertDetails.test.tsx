import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AlertDetails } from "./AlertDetails";
import * as service from "@/features/alerts/api/alerts";

const auth = vi.hoisted(() => ({ role: "viewer" }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "user", role: auth.role } }) }));
vi.mock("@/features/alerts/api/alerts", async (original) => ({
  ...await original<typeof service>(), getAlert: vi.fn(), getAlertSnapshot: vi.fn(), acknowledgeAlert: vi.fn(), resolveAlert: vi.fn(),
}));
const alert: service.SpecterAlert = {
  id: "alert", kind: "identity_match", owner_id: "owner", camera_id: "camera", camera_name: "Entrance", track_id: 1,
  object_class: "person", bounding_box: { x: 0.1, y: 0.1, width: 0.2, height: 0.3 },
  frame_captured_at: "2026-09-25T12:00:00Z", created_at: "2026-09-25T12:00:00Z", has_snapshot: true,
  snapshot_url: "https://untrusted.invalid/evidence", review: { disposition: "unreviewed", is_acknowledged: false, note: null },
  watchlist_id: "list", watchlist_name: "Staff", watchlist_kind: "watchlist", target_id: "target", target_label: "Alex",
  modality: "face", similarity_ratio: 0.95, margin_ratio: 0.1, rule_id: null, rule_kind: null, zone_id: null, dwell_seconds: null, crossing_direction: null,
};
const clients: QueryClient[] = [];
function mount(initialAlert = alert) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><AlertDetails initialAlert={initialAlert} onClose={vi.fn()} /></QueryClientProvider>);
}
const button = (name: string) => screen.getByRole("button", { name }) as HTMLButtonElement;
beforeEach(() => {
  vi.resetAllMocks(); auth.role = "viewer";
  vi.mocked(service.getAlert).mockResolvedValue(alert);
  vi.mocked(service.acknowledgeAlert).mockResolvedValue({ ...alert, review: { ...alert.review, is_acknowledged: true } });
  vi.mocked(service.resolveAlert).mockResolvedValue({ ...alert, review: { ...alert.review, disposition: "true_positive" } });
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn().mockReturnValue("blob:protected-evidence");
    static revokeObjectURL = vi.fn();
  });
});
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); vi.unstubAllGlobals(); });

describe("alert review role and confirmation guards", () => {
  it("allows viewers to acknowledge only after confirmation, but never exposes resolution", async () => {
    mount();
    await waitFor(() => expect(button("Acknowledge").disabled).toBe(false));
    expect(screen.queryByRole("button", { name: /Resolve:/ })).toBeNull();
    fireEvent.click(button("Acknowledge"));
    expect(service.acknowledgeAlert).not.toHaveBeenCalled();
    fireEvent.click(button("Confirm acknowledgment"));
    await screen.findByText("Alert acknowledged.");
    expect(vi.mocked(service.acknowledgeAlert).mock.calls[0][0]).toBe("alert");
    expect(service.acknowledgeAlert).toHaveBeenCalledTimes(1);
    expect(service.resolveAlert).not.toHaveBeenCalled();
  });

  it.each(["operator", "admin"])("allows %s to resolve with the selected disposition and note", async (role) => {
    auth.role = role;
    mount();
    await waitFor(() => expect(button("Resolve: false positive").disabled).toBe(false));
    fireEvent.click(button("Resolve: false positive"));
    fireEvent.change(screen.getByLabelText("Review note (optional)"), { target: { value: " reviewed evidence " } });
    expect(service.resolveAlert).not.toHaveBeenCalled();
    fireEvent.click(button("Confirm resolution"));
    await screen.findByText("Alert resolved as false positive.");
    expect(service.resolveAlert).toHaveBeenCalledExactlyOnceWith("alert", "false_positive", " reviewed evidence ");
  });

  it("cancels a confirmation without sending a write", async () => {
    mount();
    await waitFor(() => expect(button("Acknowledge").disabled).toBe(false));
    fireEvent.click(button("Acknowledge")); fireEvent.click(button("Cancel"));
    expect(screen.queryByRole("button", { name: "Confirm acknowledgment" })).toBeNull();
    expect(service.acknowledgeAlert).not.toHaveBeenCalled();
  });

  it("disables duplicate confirmation writes while the first is pending", async () => {
    let complete!: (value: service.SpecterAlert) => void;
    vi.mocked(service.acknowledgeAlert).mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    mount();
    await waitFor(() => expect(button("Acknowledge").disabled).toBe(false));
    fireEvent.click(button("Acknowledge")); fireEvent.click(button("Confirm acknowledgment"));
    await waitFor(() => expect(button("Confirm acknowledgment").disabled).toBe(true));
    fireEvent.click(button("Confirm acknowledgment"));
    expect(service.acknowledgeAlert).toHaveBeenCalledTimes(1);
    complete(alert);
    await screen.findByText("Alert acknowledged.");
  });

  it("retains note and confirmation after a failed resolve without automatic write retry", async () => {
    auth.role = "operator";
    vi.mocked(service.resolveAlert).mockRejectedValue(new Error("Service unavailable"));
    mount();
    await waitFor(() => expect(button("Resolve: true positive").disabled).toBe(false));
    fireEvent.click(button("Resolve: true positive"));
    fireEvent.change(screen.getByLabelText("Review note (optional)"), { target: { value: "Keep this note" } });
    fireEvent.click(button("Confirm resolution"));
    expect((await screen.findByRole("alert")).textContent).toContain("No automatic write retry");
    expect((screen.getByLabelText("Review note (optional)") as HTMLTextAreaElement).value).toBe("Keep this note");
    expect(service.resolveAlert).toHaveBeenCalledTimes(1);
  });

  it("blocks over-limit notes before mutation", async () => {
    auth.role = "admin";
    mount();
    await waitFor(() => expect(button("Resolve: true positive").disabled).toBe(false));
    fireEvent.click(button("Resolve: true positive"));
    fireEvent.change(screen.getByLabelText("Review note (optional)"), { target: { value: "x".repeat(1001) } });
    expect(button("Confirm resolution").disabled).toBe(true);
    fireEvent.click(button("Confirm resolution"));
    expect(service.resolveAlert).not.toHaveBeenCalled();
  });

  it("disables review actions when refreshed details fail, despite an initial cached alert", async () => {
    auth.role = "admin";
    vi.mocked(service.getAlert).mockRejectedValue(new Error("Detail unavailable"));
    mount();
    expect((await screen.findByRole("alert")).textContent).toContain("review actions are disabled");
    expect(button("Acknowledge").disabled).toBe(true);
    expect(button("Resolve: true positive").disabled).toBe(true);
    fireEvent.click(button("Acknowledge"));
    expect(service.acknowledgeAlert).not.toHaveBeenCalled();
  });
});

describe("protected snapshot UI", () => {
  function openSnapshot() {
    // Radix tabs activate on mouse-down, not the synthetic click alone.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Snapshot" }), { button: 0, ctrlKey: false });
  }

  it("loads lazily via the authenticated hook, ignores server URLs and revokes on closing", async () => {
    vi.mocked(service.getAlertSnapshot).mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
    const { unmount } = mount();
    await waitFor(() => expect(button("Acknowledge").disabled).toBe(false));
    expect(service.getAlertSnapshot).not.toHaveBeenCalled();
    openSnapshot();
    const image = await screen.findByRole("img", { name: "Evidence for Alex" });
    expect(image.getAttribute("src")).toBe("blob:protected-evidence");
    expect(service.getAlertSnapshot).toHaveBeenCalledWith("alert", expect.any(AbortSignal));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:protected-evidence");
  });

  it("does not request absent evidence", async () => {
    const noSnapshot = { ...alert, has_snapshot: false, snapshot_url: null };
    vi.mocked(service.getAlert).mockResolvedValue(noSnapshot);
    mount(noSnapshot); openSnapshot();
    expect(await screen.findByText("No snapshot was recorded for this alert.")).toBeTruthy();
    expect(service.getAlertSnapshot).not.toHaveBeenCalled();
  });

  it("shows an explicit retry after invalid evidence instead of displaying it", async () => {
    vi.mocked(service.getAlertSnapshot).mockRejectedValue(new Error("The server did not return a JPEG snapshot."));
    mount(); openSnapshot();
    expect(await screen.findByRole("button", { name: "Retry snapshot" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Automatic retries are limited");
    expect(screen.queryByRole("img")).toBeNull();
    expect(service.getAlertSnapshot).toHaveBeenCalledTimes(1);
  });
});