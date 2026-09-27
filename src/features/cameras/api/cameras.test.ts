import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import api from "@/services/api";
import { cameraError, camerasService } from "./cameras";
import { camera, cameraInput } from "@/test/camera-fixtures";

vi.mock("@/services/api", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

describe("camera HTTP contract", () => {
  it("lists cameras with cancellation", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [camera] } });
    const signal = new AbortController().signal;
    expect(await camerasService.list(signal)).toEqual([camera]);
    expect(api.get).toHaveBeenCalledWith("/cameras", { signal });
  });

  it("reads an encoded camera ID with cancellation", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: camera } });
    const signal = new AbortController().signal;
    expect(await camerasService.get("cam/a b", signal)).toEqual(camera);
    expect(api.get).toHaveBeenCalledWith("/cameras/cam%2Fa%20b", { signal });
  });

  it("creates using only the submitted body", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: camera } });
    expect(await camerasService.create(cameraInput)).toEqual(camera);
    expect(api.post).toHaveBeenCalledWith("/cameras", cameraInput);
  });

  it.each([undefined, null, { username: "replacement", password: "synthetic-password" }])(
    "preserves credential update semantics: %j", async (credentials) => {
      vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: camera } });
      const body = { ...cameraInput, ...(credentials === undefined ? {} : { credentials }) };
      expect(await camerasService.update("cam/a", body)).toEqual(camera);
      expect(api.put).toHaveBeenCalledWith("/cameras/cam%2Fa", body);
      expect(Object.hasOwn(body, "credentials")).toBe(credentials !== undefined);
    },
  );

  it("deletes using the resource route", async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true } });
    await expect(camerasService.remove("cam/a")).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledWith("/cameras/cam%2Fa");
  });

  it.each(["start", "stop"] as const)("discards %s 202 response state", async (action) => {
    vi.mocked(api.post).mockResolvedValue({ status: 202, data: { success: true, data: { ...camera, live_status: "running" } } });
    await expect(camerasService.control("cam/a", action)).resolves.toBeUndefined();
    expect(api.post).toHaveBeenCalledWith(`/cameras/cam%2Fa/${action}`);
  });

  it("rejects unsuccessful envelopes even on successful HTTP responses", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: false, error: "Camera is unavailable" } });
    await expect(camerasService.create(cameraInput)).rejects.toThrow("Camera is unavailable");
  });

  it("formats network and unknown errors without crashing", () => {
    expect(cameraError(new AxiosError("network"))).toContain("Cannot reach the server");
    expect(cameraError(null)).toContain("Please retry");
  });
});