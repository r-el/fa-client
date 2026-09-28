import type { PropsWithChildren } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchlistsService } from "@/features/watchlists/api/watchlists";
import type { EnrollmentStatus, ReferenceImage, Target } from "@/features/watchlists/types";
import { useEnrollmentBatch, useWatchlistMutations, useWatchlists, useWatchlistTargets, watchlistKeys } from "./use-watchlists";

vi.mock("@/features/watchlists/api/watchlists", () => ({ watchlistsService: {
  list: vi.fn(), targets: vi.fn(), enrollmentBatch: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
  createTargets: vi.fn(), updateTarget: vi.fn(), removeTarget: vi.fn(), addPhotos: vi.fn(), removePhoto: vi.fn(),
} }));

const clients: QueryClient[] = [];
function context() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return { client, wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}
const tick = (ms = 1) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
function target(enrollment_status: EnrollmentStatus, statuses: ReferenceImage["embeddings"][number]["status"][]): Target {
  return { id: "target", watchlist_id: "list", label: "Alex", target_type: "person", is_enabled: true, metadata: {},
    enrollment_batch_id: "batch", enrollment_status,
    reference_images: statuses.length ? [{ id: "photo", embeddings: statuses.map((status, index) => ({ modality: index ? "appearance" : "face", status, rejection_reason: null, quality_score_ratio: null })) }] : [],
  };
}
beforeEach(() => { vi.resetAllMocks(); vi.useFakeTimers(); });
afterEach(() => { cleanup(); clients.splice(0).forEach((client) => client.clear()); vi.useRealTimers(); });

describe.each(["targets", "enrollmentBatch"] as const)("%s async enrollment polling", (method) => {
  const useRead = method === "targets" ? useWatchlistTargets : useEnrollmentBatch;

  it("does not request an empty watchlist/batch ID", async () => {
    renderHook(() => useRead(""), context());
    await tick(10_000);
    expect(watchlistsService[method]).not.toHaveBeenCalled();
  });

  it("polls queued → partial-with-pending → ready every 2500ms, then stops", async () => {
    const read = vi.mocked(watchlistsService[method]);
    read.mockResolvedValueOnce([target("queued", ["pending", "pending"])])
      .mockResolvedValueOnce([target("partial", ["embedded", "pending"])])
      .mockResolvedValue([target("ready", ["embedded", "embedded"])]);
    const { result } = renderHook(() => useRead("id"), context());
    await tick();
    expect(result.current.data?.[0].enrollment_status).toBe("queued");
    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith("id", expect.any(AbortSignal));
    await tick(2498);
    expect(read).toHaveBeenCalledTimes(1);
    await tick(2);
    expect(result.current.data?.[0].enrollment_status).toBe("partial");
    await tick(2501);
    expect(result.current.data?.[0].enrollment_status).toBe("ready");
    await tick(10_000);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["queued", []], ["partial", ["embedded", "rejected"]], ["failed", ["rejected"]],
  ] as [EnrollmentStatus, ReferenceImage["embeddings"][number]["status"][]][])("does not poll terminal/no-work %s results", async (state, statuses) => {
    vi.mocked(watchlistsService[method]).mockResolvedValue([target(state, statuses)]);
    renderHook(() => useRead("id"), context());
    await tick(10_000);
    expect(watchlistsService[method]).toHaveBeenCalledTimes(1);
  });

  it("stops polling after a read error even if cached embeddings are still pending", async () => {
    vi.mocked(watchlistsService[method]).mockResolvedValueOnce([target("queued", ["pending"])])
      .mockRejectedValue(new Error("Batch no longer accessible"));
    const { result } = renderHook(() => useRead("id"), context());
    await tick();
    await tick(2501);
    expect(result.current.isError).toBe(true);
    await tick(10_000);
    expect(watchlistsService[method]).toHaveBeenCalledTimes(2);
  });

  it("aborts the in-flight request and removes the polling timer on unmount", async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(watchlistsService[method]).mockImplementation((_id, incoming) => {
      signal = incoming;
      return new Promise(() => {});
    });
    const { unmount } = renderHook(() => useRead("id"), context());
    expect(signal?.aborted).toBe(false);
    unmount();
    expect(signal?.aborted).toBe(true);
    await tick(10_000);
    expect(watchlistsService[method]).toHaveBeenCalledTimes(1);
  });
});

describe("watchlist cache and mutation isolation", () => {
  it("uses distinct target and batch keys and passes list cancellation", async () => {
    vi.mocked(watchlistsService.list).mockResolvedValue([]);
    const { result } = renderHook(() => useWatchlists(), context());
    await tick();
    expect(result.current.data).toEqual([]);
    expect(watchlistsService.list).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(watchlistKeys.targets("a")).not.toEqual(watchlistKeys.targets("b"));
    expect(watchlistKeys.targets("a")).not.toEqual(watchlistKeys.batch("a"));
  });

  it("cancels all pre-mutation reads before invalidating watchlists, targets and batches", async () => {
    vi.mocked(watchlistsService.removePhoto).mockResolvedValue(undefined);
    const options = context();
    const cancel = vi.spyOn(options.client, "cancelQueries");
    const invalidate = vi.spyOn(options.client, "invalidateQueries");
    const { result } = renderHook(() => useWatchlistMutations(), options);
    await act(async () => {
      await result.current.deletePhoto.mutateAsync({ watchlistId: "list", targetId: "target", imageId: "photo" });
    });
    expect(watchlistsService.removePhoto).toHaveBeenCalledWith("list", "target", "photo");
    for (const key of [["watchlists"], ["targets"], ["enrollment-batches"]]) {
      expect(cancel).toHaveBeenCalledWith({ queryKey: key });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
    }
    expect(Math.max(...cancel.mock.invocationCallOrder)).toBeLessThan(Math.min(...invalidate.mock.invocationCallOrder));
  });

  it("preserves the async batch identifier returned by target creation", async () => {
    const created = { enrollment_batch_id: "new-batch", targets: [target("queued", ["pending"])] };
    vi.mocked(watchlistsService.createTargets).mockResolvedValue(created);
    const { result } = renderHook(() => useWatchlistMutations(), context());
    const targets = [{ label: "Alex", metadata: {}, image_file_names: [] }];
    await act(async () => {
      expect(await result.current.createTargets.mutateAsync({ watchlistId: "list", targets, files: [] })).toBe(created);
    });
    expect(watchlistsService.createTargets).toHaveBeenCalledWith("list", targets, []);
  });

  it("does not invalidate successful cached reads after a failed write", async () => {
    vi.mocked(watchlistsService.remove).mockRejectedValue(new Error("Forbidden"));
    const options = context();
    const invalidate = vi.spyOn(options.client, "invalidateQueries");
    const { result } = renderHook(() => useWatchlistMutations(), options);
    await act(async () => { await expect(result.current.deleteWatchlist.mutateAsync("list")).rejects.toThrow("Forbidden"); });
    expect(invalidate).not.toHaveBeenCalled();
    expect(watchlistsService.remove).toHaveBeenCalledTimes(1);
  });
});