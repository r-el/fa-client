import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeSync } from "./RealtimeSync";

const mocks = vi.hoisted(() => ({
  auth: { isAuthenticated: true, user: { id: "user_a" } },
  handlers: new Map<string, (...args: unknown[]) => void>(),
  connect: vi.fn(), disconnect: vi.fn(), removeAllListeners: vi.fn(), io: vi.fn(),
}));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("socket.io-client", () => ({ io: mocks.io }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const view = render(<QueryClientProvider client={client}><RealtimeSync /></QueryClientProvider>);
  return { client, invalidate, ...view };
}
function emit(event: string, value?: unknown) {
  act(() => { mocks.handlers.get(event)?.(value); });
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.handlers.clear();
  mocks.auth.isAuthenticated = true;
  mocks.io.mockReturnValue({
    on: (event: string, handler: (...args: unknown[]) => void) => mocks.handlers.set(event, handler),
    connect: mocks.connect, disconnect: mocks.disconnect, removeAllListeners: mocks.removeAllListeners,
  });
});
afterEach(() => vi.useRealTimers());

describe("RealtimeSync", () => {
  it("never connects before authentication", () => {
    mocks.auth.isAuthenticated = false;
    const { container } = setup();
    expect(mocks.io).not.toHaveBeenCalled();
    expect(container.textContent).toBe("");
  });
  it("reads the current token for each handshake without placing it in the URL", () => {
    setup();
    const [url, options] = mocks.io.mock.calls[0];
    expect(url).not.toContain("token");
    const callback = vi.fn();
    localStorage.setItem("token", "test-token-one");
    options.auth(callback);
    expect(callback).toHaveBeenLastCalledWith({ token: "test-token-one" });
    localStorage.setItem("token", "test-token-two");
    options.auth(callback);
    expect(callback).toHaveBeenLastCalledWith({ token: "test-token-two" });
    expect(mocks.connect).toHaveBeenCalledOnce();
  });
  it("reconciles all resources on connect and reconnect and shows connection state", () => {
    const { invalidate } = setup();
    emit("connect");
    expect(screen.getByRole("status").textContent).toBe("Live updates connected");
    act(() => vi.advanceTimersByTime(250));
    expect(invalidate.mock.calls.map(([filter]) => filter?.queryKey)).toEqual([
      ["cameras"], ["alerts"], ["dashboard"], ["watchlists"], ["targets"], ["enrollment-batches"],
    ]);
    emit("disconnect");
    expect(screen.getByRole("status").textContent).toContain("disconnected");
    invalidate.mockClear();
    emit("connect");
    act(() => vi.advanceTimersByTime(250));
    expect(invalidate).toHaveBeenCalledTimes(6);
  });
  it("updates only the affected camera live status and ignores older events", () => {
    const { client } = setup();
    client.setQueryData(["cameras"], [{ id: "a", live_status: "stopped", desired_state: "running" }, { id: "b", live_status: "stopped" }]);
    emit("notification", { kind: "camera_status", cameraId: "a", status: "running", timestamp: "2026-09-25T10:00:02Z" });
    emit("notification", { kind: "camera_status", cameraId: "a", status: "starting", timestamp: "2026-09-25T10:00:01Z" });
    expect(client.getQueryData(["cameras"])).toEqual([
      { id: "a", live_status: "running", desired_state: "running" }, { id: "b", live_status: "stopped" },
    ]);
  });
  it("coalesces notification bursts and retries alert persistence once", () => {
    const { invalidate } = setup();
    for (let i = 0; i < 20; i++) emit("notification", { kind: "alert" });
    act(() => vi.advanceTimersByTime(250));
    expect(invalidate).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(1500));
    expect(invalidate).toHaveBeenCalledTimes(4);
    act(() => vi.advanceTimersByTime(10_000));
    expect(invalidate).toHaveBeenCalledTimes(4);
  });
  it("refreshes enrollment and configuration resources", () => {
    const { invalidate } = setup();
    emit("notification", { kind: "enrollment" });
    act(() => vi.advanceTimersByTime(250));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["targets"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["enrollment-batches"] });
    invalidate.mockClear();
    emit("notification", { kind: "configuration_changed" });
    act(() => vi.advanceTimersByTime(250));
    expect(invalidate).toHaveBeenCalledTimes(6);
  });
  it("cancels connections and delayed refetches on unmount", () => {
    const { unmount, invalidate } = setup();
    emit("notification", { kind: "alert" });
    unmount();
    act(() => vi.advanceTimersByTime(3000));
    expect(invalidate).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(mocks.removeAllListeners).toHaveBeenCalledOnce();
  });
});