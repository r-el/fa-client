import type { PropsWithChildren } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as service from "@/features/alerts/api/alerts";
import { alertKeys, useAlert, useAlertActions, useAlerts, useAlertSnapshot } from "./use-alerts";

vi.mock("@/features/alerts/api/alerts", async (original) => ({
  ...await original<typeof service>(), getAlerts: vi.fn(), getAlert: vi.fn(), getAlertSnapshot: vi.fn(),
  getAlertSummary: vi.fn(), acknowledgeAlert: vi.fn(), resolveAlert: vi.fn(),
}));

const clients: QueryClient[] = [];
function context() {
  // Hook consumers inspect different fields in each assertion, unlike a fixed component render.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, notifyOnChangeProps: "all" } } });
  clients.push(client);
  return { client, wrapper: ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}
const tick = (ms = 1) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const error = (status: number) => new AxiosError("unavailable", "ERR_BAD_RESPONSE", undefined, undefined, {
  status, statusText: "error", headers: {}, data: {}, config: { headers: new AxiosHeaders() },
});
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn().mockReturnValueOnce("blob:first").mockReturnValueOnce("blob:second");
    static revokeObjectURL = vi.fn();
  });
});
afterEach(() => {
  cleanup(); clients.splice(0).forEach((client) => client.clear());
  focusManager.setFocused(undefined); onlineManager.setOnline(true);
  vi.unstubAllGlobals(); vi.useRealTimers();
});

describe("alert cursor pagination", () => {
  it("forwards filters/cursors and stops on repeated or cyclic cursors", async () => {
    vi.mocked(service.getAlerts).mockResolvedValueOnce({ alerts: [], next_cursor: "cursor-a" })
      .mockResolvedValueOnce({ alerts: [], next_cursor: "cursor-b" })
      .mockResolvedValueOnce({ alerts: [], next_cursor: "cursor-a" });
    const filters = { camera_id: ["a", "b"], kind: "rule" as const };
    const { result } = renderHook(() => useAlerts(filters), context());
    await tick();
    expect(service.getAlerts).toHaveBeenNthCalledWith(1, filters, "", expect.any(AbortSignal));
    await act(async () => { await result.current.fetchNextPage(); }); await tick();
    expect(service.getAlerts).toHaveBeenNthCalledWith(2, filters, "cursor-a", expect.any(AbortSignal));
    await act(async () => { await result.current.fetchNextPage(); }); await tick();
    expect(service.getAlerts).toHaveBeenNthCalledWith(3, filters, "cursor-b", expect.any(AbortSignal));
    expect(result.current.hasNextPage).toBe(false);
    await act(async () => { await result.current.fetchNextPage(); });
    expect(service.getAlerts).toHaveBeenCalledTimes(3);
  });

  it("stops immediately when a page repeats its own cursor", async () => {
    vi.mocked(service.getAlerts).mockResolvedValue({ alerts: [], next_cursor: "same" });
    const { result } = renderHook(() => useAlerts(), context());
    await tick();
    await act(async () => { await result.current.fetchNextPage(); }); await tick();
    expect(result.current.hasNextPage).toBe(false);
  });

  it("starts a fresh cursor chain on filter changes rather than mixing cached pages", async () => {
    vi.mocked(service.getAlerts).mockResolvedValue({ alerts: [], next_cursor: "next" });
    const { result, rerender } = renderHook(({ camera }) => useAlerts({ camera_id: [camera] }), { ...context(), initialProps: { camera: "a" } });
    await tick();
    await act(async () => { await result.current.fetchNextPage(); }); await tick();
    rerender({ camera: "b" }); await tick();
    expect(service.getAlerts).toHaveBeenLastCalledWith({ camera_id: ["b"] }, "", expect.any(AbortSignal));
    expect(result.current.data?.pages).toHaveLength(1);
  });
});

describe("snapshot retries and resource lifetime", () => {
  it("makes at most three 404 attempts and does not restart on focus/reconnect", async () => {
    vi.mocked(service.getAlertSnapshot).mockRejectedValue(error(404));
    const { result } = renderHook(() => useAlertSnapshot("alert", true), context());
    await tick(); expect(service.getAlertSnapshot).toHaveBeenCalledTimes(1);
    await tick(500); expect(service.getAlertSnapshot).toHaveBeenCalledTimes(2);
    await tick(1001); expect(service.getAlertSnapshot).toHaveBeenCalledTimes(3);
    expect(result.current.isError).toBe(true);
    act(() => { focusManager.setFocused(false); focusManager.setFocused(true); onlineManager.setOnline(false); onlineManager.setOnline(true); });
    await tick(60_000);
    expect(service.getAlertSnapshot).toHaveBeenCalledTimes(3);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it.each([401, 403, 422])("does not retry snapshot authorization/validation HTTP %i", async (status) => {
    vi.mocked(service.getAlertSnapshot).mockRejectedValue(error(status));
    const { result } = renderHook(() => useAlertSnapshot("alert", true), context());
    await tick(10_000);
    expect(result.current.isError).toBe(true);
    expect(service.getAlertSnapshot).toHaveBeenCalledTimes(1);
  });

  it("retries an eventually available snapshot and revokes its object URL on unmount", async () => {
    const blob = new Blob(["jpeg"], { type: "image/jpeg" });
    vi.mocked(service.getAlertSnapshot).mockRejectedValueOnce(error(404)).mockResolvedValue(blob);
    const options = context();
    const { result, unmount } = renderHook(() => useAlertSnapshot("alert", true), options);
    await tick(502);
    expect(result.current.url).toBe("blob:first");
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    unmount(); await tick();
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:first");
    expect(options.client.getQueryData(alertKeys.snapshot("alert"))).toBeUndefined();
  });

  it("hides stale images during selection changes, revokes replaced/disabled URLs and skips disabled requests", async () => {
    vi.mocked(service.getAlertSnapshot).mockResolvedValue(new Blob(["first"], { type: "image/jpeg" }));
    const { result, rerender } = renderHook(({ id, enabled }) => useAlertSnapshot(id, enabled), { ...context(), initialProps: { id: "a", enabled: false } });
    await tick(); expect(service.getAlertSnapshot).not.toHaveBeenCalled();
    rerender({ id: "a", enabled: true }); await tick();
    expect(result.current.url).toBe("blob:first");
    vi.mocked(service.getAlertSnapshot).mockResolvedValue(new Blob(["second"], { type: "image/jpeg" }));
    rerender({ id: "b", enabled: true });
    expect(result.current.url).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:first");
    await tick(); expect(result.current.url).toBe("blob:second");
    rerender({ id: "b", enabled: false });
    expect(result.current.url).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:second");
    expect(service.getAlertSnapshot).toHaveBeenCalledTimes(2);
  });

  it("aborts in-flight snapshot reads and prevents late object URLs after unmount", async () => {
    let resolve!: (blob: Blob) => void;
    let signal: AbortSignal | undefined;
    vi.mocked(service.getAlertSnapshot).mockImplementation((_id, incoming) => {
      signal = incoming;
      return new Promise((done) => { resolve = done; });
    });
    const { unmount } = renderHook(() => useAlertSnapshot("a", true), context());
    expect(signal?.aborted).toBe(false);
    unmount(); expect(signal?.aborted).toBe(true);
    await act(async () => { resolve(new Blob(["late"], { type: "image/jpeg" })); });
    await tick(10_000);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("cancels scheduled 404 retries on unmount", async () => {
    vi.mocked(service.getAlertSnapshot).mockRejectedValue(error(404));
    const { unmount } = renderHook(() => useAlertSnapshot("a", true), context());
    await tick(); unmount(); await tick(10_000);
    expect(service.getAlertSnapshot).toHaveBeenCalledTimes(1);
  });

  it("does not request detail or snapshot for an empty ID", async () => {
    renderHook(() => { useAlert(""); return useAlertSnapshot("", true); }, context());
    await tick();
    expect(service.getAlert).not.toHaveBeenCalled();
    expect(service.getAlertSnapshot).not.toHaveBeenCalled();
  });
});

describe("alert writes and cache refresh", () => {
  it.each(["acknowledge", "resolve"] as const)("updates detail and invalidates lists, summaries and dashboard after %s", async (action) => {
    const alert = { id: "a", review: { disposition: "true_positive", is_acknowledged: true, note: "reviewed" } } as service.SpecterAlert;
    vi.mocked(service.acknowledgeAlert).mockResolvedValue(alert);
    vi.mocked(service.resolveAlert).mockResolvedValue(alert);
    const options = context();
    const invalidate = vi.spyOn(options.client, "invalidateQueries");
    const { result } = renderHook(() => useAlertActions(), options);
    await act(async () => {
      if (action === "acknowledge") await result.current.acknowledge.mutateAsync("a");
      else await result.current.resolve.mutateAsync({ id: "a", disposition: "true_positive", note: "reviewed" });
    });
    expect(options.client.getQueryData(alertKeys.detail("a"))).toBe(alert);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["alerts"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["dashboard", "stats"] });
    if (action === "resolve") expect(service.resolveAlert).toHaveBeenCalledWith("a", "true_positive", "reviewed");
    else expect(service.acknowledgeAlert).toHaveBeenCalledWith("a", expect.anything());
  });

  it.each(["acknowledge", "resolve"] as const)("never retries failed %s writes", async (action) => {
    vi.mocked(service.acknowledgeAlert).mockRejectedValue(error(503));
    vi.mocked(service.resolveAlert).mockRejectedValue(error(503));
    const options = context();
    const invalidate = vi.spyOn(options.client, "invalidateQueries");
    const { result } = renderHook(() => useAlertActions(), options);
    await act(async () => {
      const promise = action === "acknowledge" ? result.current.acknowledge.mutateAsync("a") : result.current.resolve.mutateAsync({ id: "a", disposition: "false_positive" });
      await expect(promise).rejects.toThrow("unavailable");
    });
    await tick(10_000);
    expect(action === "acknowledge" ? service.acknowledgeAlert : service.resolveAlert).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
  });
});