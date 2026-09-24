import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlertsTable } from "./alerts-table";
import { useAlerts } from "@/hooks/use-alerts";
import type { SpecterAlert } from "@/services/alerts";

const visibility = vi.hoisted(() => ({ inView: false }));
vi.mock("react-intersection-observer", () => ({ useInView: () => ({ ref: vi.fn(), inView: visibility.inView }) }));
vi.mock("@/hooks/use-alerts", () => ({ useAlerts: vi.fn() }));
vi.mock("@/components/alert-details", () => ({ AlertDetails: ({ initialAlert }: { initialAlert: SpecterAlert }) => <div role="dialog">Selected {initialAlert.id}</div> }));

function alert(id: string, kind: SpecterAlert["kind"] = "identity_match"): SpecterAlert {
  return { id, kind, owner_id: "owner", camera_id: "cam/a", camera_name: "Entrance", track_id: 1,
    object_class: "person", bounding_box: { x: 0, y: 0, width: 0.2, height: 0.3 },
    frame_captured_at: "2026-09-25T12:00:00Z", created_at: "2026-09-25T12:00:00Z", has_snapshot: true,
    snapshot_url: "https://untrusted.invalid/snapshot", review: { disposition: "unreviewed", is_acknowledged: false, note: null },
    watchlist_id: "list", watchlist_name: "Staff", watchlist_kind: "watchlist", target_id: "target", target_label: `Person ${id}`,
    modality: "face", similarity_ratio: 0.955, margin_ratio: 0.1, rule_id: "rule", rule_kind: kind === "rule" ? "line_crossing" : null,
    zone_id: null, dwell_seconds: null, crossing_direction: null,
  };
}
function query(overrides = {}) {
  const value = { data: { pages: [{ alerts: [alert("a")], next_cursor: null }] }, isLoading: false, isFetching: false,
    isError: false, error: null, hasNextPage: false, isFetchingNextPage: false, isFetchNextPageError: false,
    fetchNextPage: vi.fn().mockResolvedValue(undefined), refetch: vi.fn().mockResolvedValue(undefined), ...overrides };
  vi.mocked(useAlerts).mockReturnValue(value as unknown as ReturnType<typeof useAlerts>);
  return value;
}
const mount = (limit?: number) => render(<MemoryRouter><AlertsTable limit={limit} /></MemoryRouter>);
beforeEach(() => { vi.clearAllMocks(); visibility.inView = false; query(); });

describe("alert rows and pagination", () => {
  it("deduplicates IDs across pages while rendering identity and rule contracts", () => {
    query({ data: { pages: [{ alerts: [alert("a")], next_cursor: "next" }, { alerts: [alert("a"), alert("b", "rule")], next_cursor: null }] } });
    mount();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("2 alerts loaded")).toBeTruthy();
    expect(screen.getByText("95.5%")).toBeTruthy();
    expect(screen.getByText("line crossing")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Entrance" })[0].getAttribute("href")).toBe("/cameras?camera_id=cam%2Fa");
    fireEvent.click(screen.getAllByRole("link", { name: "Entrance" })[0]);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View alert a" }));
    expect(screen.getByRole("dialog").textContent).toBe("Selected a");
  });

  it("caps preview rows/page size and never auto-paginates a preview", () => {
    visibility.inView = true;
    const current = query({ data: { pages: [{ alerts: [alert("a"), alert("b"), alert("c")], next_cursor: "next" }] }, hasNextPage: true });
    mount(2);
    expect(useAlerts).toHaveBeenCalledWith({ limit: 2 });
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByRole("form", { name: "Filter alerts" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    expect(current.fetchNextPage).not.toHaveBeenCalled();
  });

  it.each([[500, 200], [-1, 1], [2.9, 2]])("bounds preview limit %s to %s", (limit, expected) => {
    mount(limit);
    expect(useAlerts).toHaveBeenCalledWith({ limit: expected });
  });

  it("loads more when visible and idle", async () => {
    visibility.inView = true;
    const current = query({ hasNextPage: true });
    mount();
    await waitFor(() => expect(current.fetchNextPage).toHaveBeenCalledTimes(1));
  });

  it("preserves rows and stops automatic pagination after errors, allowing explicit retry", () => {
    visibility.inView = true;
    const current = query({ hasNextPage: true, isError: true, isFetchNextPageError: true, error: new Error("Next page unavailable") });
    mount();
    expect(current.fetchNextPage).not.toHaveBeenCalled();
    expect(screen.getByText("Already loaded alerts are still shown.")).toBeTruthy();
    expect(screen.getByText("Person a")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Retry loading more" })[0]);
    expect(current.fetchNextPage).toHaveBeenCalledTimes(1);
    expect(current.refetch).not.toHaveBeenCalled();
  });

  it("does not auto-paginate while another request is in flight", () => {
    visibility.inView = true;
    const current = query({ hasNextPage: true, isFetching: true });
    mount();
    expect(current.fetchNextPage).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Refresh" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("server-side alert filters", () => {
  it("applies deduplicated cameras, kind, disposition and ISO dates only on submit, then resets", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Camera IDs"), { target: { value: " a, b, a, , " } });
    fireEvent.change(screen.getByLabelText("Alert kind"), { target: { value: "rule" } });
    fireEvent.change(screen.getByLabelText("Disposition"), { target: { value: "false_positive" } });
    fireEvent.change(screen.getByLabelText("Created from (local time)"), { target: { value: "2026-09-01T09:00" } });
    fireEvent.change(screen.getByLabelText("Created until (local time)"), { target: { value: "2026-09-25T10:00" } });
    expect(useAlerts).toHaveBeenLastCalledWith({ limit: 20 });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(useAlerts).toHaveBeenLastCalledWith({ limit: 20, camera_id: ["a", "b"], kind: "rule", disposition: "false_positive",
      created_since: new Date("2026-09-01T09:00").toISOString(), created_until: new Date("2026-09-25T10:00").toISOString() });
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(useAlerts).toHaveBeenLastCalledWith({ limit: 20 });
    expect((screen.getByLabelText("Camera IDs") as HTMLInputElement).value).toBe("");
  });

  it("rejects reversed dates without changing the query", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Created from (local time)"), { target: { value: "2026-09-25T10:00" } });
    fireEvent.change(screen.getByLabelText("Created until (local time)"), { target: { value: "2026-09-01T10:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(screen.getByRole("alert").textContent).toContain("start date must be before");
    expect(useAlerts).toHaveBeenLastCalledWith({ limit: 20 });
  });

  it("accepts 500 camera IDs but rejects 501 without replacing the applied filters", () => {
    mount();
    const cameras = Array.from({ length: 500 }, (_, i) => `camera-${i}`);
    fireEvent.change(screen.getByLabelText("Camera IDs"), { target: { value: cameras.join(",") } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(useAlerts).toHaveBeenLastCalledWith(expect.objectContaining({ camera_id: cameras }));
    fireEvent.change(screen.getByLabelText("Camera IDs"), { target: { value: [...cameras, "extra"].join(",") } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    expect(screen.getByRole("alert").textContent).toContain("no more than 500");
    expect(useAlerts).toHaveBeenLastCalledWith(expect.objectContaining({ camera_id: cameras }));
  });
});