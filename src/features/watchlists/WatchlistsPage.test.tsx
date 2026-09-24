import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WatchlistsPage from "./WatchlistsPage";
import { watchlistsService } from "@/features/watchlists/api/watchlists";
import type { Watchlist } from "@/features/watchlists/types";

const auth = vi.hoisted(() => ({ role: "operator", loading: false, isAuthenticated: true }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ ...auth, user: { id: "user", role: auth.role } }) }));
vi.mock("@/features/watchlists/api/watchlists", () => ({ watchlistsService: {
  list: vi.fn(), targets: vi.fn(), enrollmentBatch: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
  createTargets: vi.fn(), updateTarget: vi.fn(), removeTarget: vi.fn(), addPhotos: vi.fn(), removePhoto: vi.fn(), photo: vi.fn(),
} }));
const list: Watchlist = { id: "list", owner_id: "owner", name: "Staff", kind: "watchlist", target_type: "person", metadata: {}, face_match_threshold_ratio: 0.45, appearance_match_threshold_ratio: 0.75 };
const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return render(<QueryClientProvider client={client}><WatchlistsPage /></QueryClientProvider>);
}
beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(auth, { role: "operator", loading: false, isAuthenticated: true });
  vi.mocked(watchlistsService.list).mockResolvedValue([list]);
  vi.mocked(watchlistsService.targets).mockResolvedValue([]);
  vi.mocked(watchlistsService.enrollmentBatch).mockResolvedValue([]);
});
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); });

describe("watchlist role guard", () => {
  it.each([
    { role: "viewer", loading: false, isAuthenticated: true },
    { role: "admin", loading: true, isAuthenticated: true },
    { role: "operator", loading: false, isAuthenticated: false },
  ])("mounts no protected queries or image requests for %j", async (state) => {
    Object.assign(auth, state);
    mount();
    if (state.loading) expect(screen.getByRole("status", { name: "Loading authentication" })).toBeTruthy();
    else expect(screen.getByRole("alert").textContent).toContain("Only administrators and operators");
    await Promise.resolve();
    for (const method of Object.values(watchlistsService)) expect(method).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Create watchlist" })).toBeNull();
  });

  it.each(["operator", "admin"])("allows %s to load watchlists and targets", async (role) => {
    auth.role = role;
    mount();
    expect(await screen.findByRole("heading", { name: "Staff" })).toBeTruthy();
    await waitFor(() => expect(watchlistsService.targets).toHaveBeenCalledWith("list", expect.any(AbortSignal)));
    expect(screen.getByRole("button", { name: "Add target" })).toBeTruthy();
  });
});

describe("watchlist workspace workflows", () => {
  it("creates and selects a new watchlist using the actual mutation hook", async () => {
    vi.mocked(watchlistsService.list).mockResolvedValueOnce([]).mockResolvedValue([list]);
    vi.mocked(watchlistsService.create).mockResolvedValue(list);
    mount();
    await screen.findByText(/No watchlists yet/);
    fireEvent.click(screen.getByRole("button", { name: "Create watchlist" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Staff  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save watchlist" }));
    await screen.findByRole("heading", { name: "Staff" });
    expect(watchlistsService.create).toHaveBeenCalledWith({ name: "Staff", target_type: "person", kind: "watchlist", metadata: {}, face_match_threshold_ratio: 0.45, appearance_match_threshold_ratio: 0.75 });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not send immutable target_type when editing a watchlist", async () => {
    vi.mocked(watchlistsService.update).mockResolvedValue(list);
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Edit watchlist Staff" }));
    expect((screen.getByLabelText("Target type") as HTMLSelectElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save watchlist" }));
    await waitFor(() => expect(watchlistsService.update).toHaveBeenCalledWith("list", { name: "Renamed", kind: "watchlist", metadata: {}, face_match_threshold_ratio: 0.45, appearance_match_threshold_ratio: 0.75 }));
  });

  it("shows the returned enrollment batch after creating a target without photos", async () => {
    vi.mocked(watchlistsService.createTargets).mockResolvedValue({ enrollment_batch_id: "new-batch", targets: [] });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Add target" }));
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "  Alex  " } });
    fireEvent.click(screen.getByRole("button", { name: "Create target" }));
    expect(await screen.findByText("new-batch")).toBeTruthy();
    expect(watchlistsService.createTargets).toHaveBeenCalledWith("list", [{ label: "Alex", metadata: {}, image_file_names: [] }], []);
    await waitFor(() => expect(watchlistsService.enrollmentBatch).toHaveBeenCalledWith("new-batch", expect.any(AbortSignal)));
  });
});