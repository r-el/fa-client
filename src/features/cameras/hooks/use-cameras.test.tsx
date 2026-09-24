import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { camerasService } from "@/features/cameras/api/cameras";
import { camera, cameraInput, cameraQueryClient } from "@/test/camera-fixtures";
import { useCameraDetails, useCameraMutations } from "./use-cameras";

vi.mock("@/features/cameras/api/cameras", async (original) => ({
  ...await original<typeof import("@/features/cameras/api/cameras")>(),
  camerasService: { get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), control: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
let client = cameraQueryClient();
beforeEach(() => { vi.resetAllMocks(); client = cameraQueryClient(); });
afterEach(() => client.clear());
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

it("details stay disabled without an ID and forward cancellation when enabled", async () => {
  vi.mocked(camerasService.get).mockImplementation(() => new Promise(() => {}));
  const initialProps: { id?: string } = {};
  const { rerender, unmount } = renderHook(({ id }: { id?: string }) => useCameraDetails(id), { wrapper, initialProps });
  expect(camerasService.get).not.toHaveBeenCalled();
  rerender({ id: "cam-1" });
  await waitFor(() => expect(camerasService.get).toHaveBeenCalledOnce());
  const [id, signal] = vi.mocked(camerasService.get).mock.calls[0];
  expect(id).toBe("cam-1");
  expect(signal?.aborted).toBe(false);
  unmount();
  expect(signal?.aborted).toBe(true);
});

it.each(["create", "update", "remove", "control"] as const)("%s cancels stale camera reads and invalidates camera/dashboard queries", async (kind) => {
  client.setQueryData(["cameras"], [camera]);
  client.setQueryData(["dashboard", "stats"], { activeCameras: 0 });
  const cancel = vi.spyOn(client, "cancelQueries");
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const { result } = renderHook(useCameraMutations, { wrapper });
  await act(async () => {
    switch (kind) {
      case "create": await result.current.create.mutateAsync(cameraInput); break;
      case "update": await result.current.update.mutateAsync({ id: camera.id, body: cameraInput }); break;
      case "remove": await result.current.remove.mutateAsync(camera.id); break;
      case "control": await result.current.control.mutateAsync({ id: camera.id, action: "start" }); break;
    }
  });
  expect(cancel).toHaveBeenCalledWith({ queryKey: ["cameras"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["cameras"] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
  expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(invalidate.mock.invocationCallOrder[0]);
  expect(client.getQueryData(["cameras"])).toEqual([camera]);
  if (kind === "control") expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Waiting for reported status"));
});

it("failed mutations expose the error and do not invalidate or alter observed state", async () => {
  client.setQueryData(["cameras"], [camera]);
  const invalidate = vi.spyOn(client, "invalidateQueries");
  vi.mocked(camerasService.control).mockRejectedValue(new Error("Not allowed"));
  const { result } = renderHook(useCameraMutations, { wrapper });
  await act(async () => {
    await expect(result.current.control.mutateAsync({ id: camera.id, action: "start" })).rejects.toThrow("Not allowed");
  });
  expect(toast.error).toHaveBeenCalledWith("Not allowed");
  expect(invalidate).not.toHaveBeenCalled();
  expect(client.getQueryData(["cameras"])).toEqual([camera]);
});