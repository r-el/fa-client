import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, expect, it } from "vitest";
import api from "../../../services/api";
import { getLiveCamera, getLiveFrame, liveFailure, requestLiveSocketUrl } from "./live";

// Exercise the real axios instance and its auth interceptor without network traffic.
const originalAdapter = api.defaults.adapter;
const originalBase = api.defaults.baseURL;
let requests: InternalAxiosRequestConfig[];
let responseData: unknown;
beforeEach(() => {
  requests = [];
  responseData = { success: true, data: { ticket: "ticket-1", expires_in: 60 } };
  localStorage.setItem("token", "synthetic-user-jwt");
  api.defaults.baseURL = "https://api.example/base/api";
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config);
    return { data: responseData, status: 200, statusText: "OK", headers: new AxiosHeaders(), config };
  };
  api.defaults.adapter = adapter;
});
afterEach(() => { api.defaults.adapter = originalAdapter; api.defaults.baseURL = originalBase; });

it("each attempt obtains a fresh ticket; only that ticket enters the prefixed WS URL", async () => {
  const signal = new AbortController().signal;
  const first = await requestLiveSocketUrl("cam-1", signal);
  responseData = { success: true, data: { ticket: "ticket-2", expires_in: 60 } };
  const second = await requestLiveSocketUrl("cam-1", signal);
  expect(first).toBe("wss://api.example/base/api/cameras/cam-1/live/mse?ticket=ticket-1");
  expect(second).toBe("wss://api.example/base/api/cameras/cam-1/live/mse?ticket=ticket-2");
  expect(requests).toHaveLength(2);
  for (const request of requests) {
    expect(request.method).toBe("post");
    expect(request.url).toBe("/cameras/cam-1/live/ticket");
    expect(request.headers.get("Authorization")).toBe("Bearer synthetic-user-jwt");
    expect(request.signal).toBe(signal);
    expect(request.data).toBe("{}");
  }
  for (const url of [first, second]) {
    expect([...new URL(url).searchParams.keys()]).toEqual(["ticket"]);
    expect(url).not.toContain("synthetic-user-jwt");
  }
});

it("JPEG fallback uses authenticated axios, cancellation and blob response rather than a JWT URL", async () => {
  responseData = new Blob(["synthetic-jpeg"], { type: "image/jpeg" });
  const signal = new AbortController().signal;
  expect(await getLiveFrame("cam-1", signal)).toBe(responseData);
  expect(requests[0]).toMatchObject({ url: "/cameras/cam-1/live/frame.jpeg", responseType: "blob", signal });
  expect(requests[0].headers.get("Authorization")).toBe("Bearer synthetic-user-jwt");
  expect(requests[0].headers.get("Accept")).toBe("image/jpeg");
  expect(api.getUri(requests[0])).not.toContain("synthetic-user-jwt");
  expect(api.getUri(requests[0])).not.toContain("?");
});

it.each([new Blob([], { type: "image/jpeg" }), new Blob(["html"], { type: "text/html" }), "not a blob"])(
  "rejects invalid JPEG responses %#", async (data) => {
    responseData = data;
    await expect(getLiveFrame("cam-1", new AbortController().signal)).rejects.toThrow("JPEG snapshot");
  },
);

it.each([
  { success: false }, { success: true },
  { success: true, data: { ticket: "", expires_in: 60 } },
  { success: true, data: { ticket: "ticket", expires_in: 0 } },
])("rejects invalid or expired ticket envelopes %#", async (data) => {
  responseData = data;
  await expect(requestLiveSocketUrl("cam-1", new AbortController().signal)).rejects.toThrow("ticket response was invalid");
});

it("aborted ticket requests do not produce a socket URL", async () => {
  const controller = new AbortController();
  api.defaults.adapter = async (config) => {
    controller.abort();
    return { data: responseData, status: 200, statusText: "OK", headers: {}, config };
  };
  await expect(requestLiveSocketUrl("cam-1", controller.signal)).rejects.toThrow();
});

it.each(["../other", "cam/a", "cam?token=synthetic"])("rejects unsafe camera ID %s before HTTP", async (id) => {
  await expect(requestLiveSocketUrl(id, new AbortController().signal)).rejects.toThrow("Invalid camera ID");
  expect(requests).toHaveLength(0);
});

it.each(["https://fake:synthetic@api.example/api", "https://api.example/api?token=synthetic", "ftp://api.example/api"])(
  "rejects unsafe API base %s before sending Authorization", async (base) => {
    api.defaults.baseURL = base;
    await expect(getLiveFrame("cam-1", new AbortController().signal)).rejects.toThrow();
    expect(requests).toHaveLength(0);
  },
);

it("validates camera ownership response ID", async () => {
  responseData = { success: true, data: { id: "other-camera", name: "Other" } };
  await expect(getLiveCamera("cam-1", new AbortController().signal)).rejects.toThrow("camera response was invalid");
});

it.each([[401, false], [403, false], [404, false], [409, false], [503, true]] as const)(
  "maps HTTP %s without exposing raw upstream details", (status, retryable) => {
    const error = new AxiosError("rtsp://fake:synthetic@upstream");
    error.response = { status, statusText: "error", data: { error: "private-upstream-url" }, headers: {}, config: { headers: new AxiosHeaders() } };
    const failure = liveFailure(error);
    expect(failure.retryable).toBe(retryable);
    expect(failure.message).not.toMatch(/synthetic|upstream|rtsp/);
  },
);