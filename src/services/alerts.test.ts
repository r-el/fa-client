import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders, CanceledError } from "axios";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import api from "@/services/api";
import { acknowledgeAlert, alertErrorMessage, getAlert, getAlerts, getAlertSnapshot, getAlertSummary, resolveAlert, retryAlertRead } from "./alerts";

// Keep real Axios transforms and the production authentication interceptor; replace only transport.
const originalAdapter = api.defaults.adapter;
const transport = vi.fn<AxiosAdapter>();
let requests: InternalAxiosRequestConfig[];
let responseData: unknown;
beforeEach(() => {
  requests = [];
  responseData = { success: true, data: { id: "alert" } };
  transport.mockReset().mockImplementation(async (config) => {
    requests.push(config);
    return { data: responseData, status: 200, statusText: "OK", headers: {}, config };
  });
  api.defaults.adapter = transport;
});
afterEach(() => { api.defaults.adapter = originalAdapter; });

describe("alert HTTP contracts through authenticated Axios", () => {
  it("unwraps list data and serializes repeated camera IDs and opaque cursors", async () => {
    const signal = new AbortController().signal;
    const page = { alerts: [], next_cursor: "next" };
    responseData = { success: true, data: page };
    expect(await getAlerts({ camera_id: ["cam/a", "cam+b"], kind: "rule", disposition: "false_positive", created_since: "2026-09-01T00:00:00Z", created_until: "2026-09-25T00:00:00Z", limit: 200 }, "opaque+/=&", signal)).toEqual(page);
    const config = requests[0];
    expect(config.url).toBe("/alerts");
    expect(config.signal).toBe(signal);
    const params = new URLSearchParams(api.getUri(config).split("?")[1]);
    expect(params.getAll("camera_id")).toEqual(["cam/a", "cam+b"]);
    expect(params.has("camera_id[]")).toBe(false);
    expect(Object.fromEntries(params)).toMatchObject({ kind: "rule", disposition: "false_positive", limit: "200", cursor: "opaque+/=&", created_since: "2026-09-01T00:00:00Z", created_until: "2026-09-25T00:00:00Z" });
  });

  it("omits absent filters and the initial empty cursor", async () => {
    await getAlerts({}, "");
    expect(requests[0].params.toString()).toBe("");
  });

  it("unwraps details and summary data using the fa endpoints", async () => {
    const signal = new AbortController().signal;
    expect(await getAlert("id/?", signal)).toEqual({ id: "alert" });
    expect(requests[0]).toMatchObject({ url: "/alerts/id%2F%3F", signal });
    const summary = { total_count: 4, unacknowledged_count: 2, counts: [], daily_counts: [] };
    responseData = { success: true, data: summary };
    expect(await getAlertSummary({ camera_id: ["a", "b"], created_since: "2026-09-01T00:00:00Z" }, signal)).toEqual(summary);
    expect(requests[1].url).toBe("/alerts/summary");
    expect(requests[1].params.getAll("camera_id")).toEqual(["a", "b"]);
    expect(Array.from(requests[1].params.keys())).toEqual(["camera_id", "camera_id", "created_since"]);
  });

  it("acknowledges without a body and resolves with disposition plus a trimmed optional note", async () => {
    expect(await acknowledgeAlert("a/b")).toEqual({ id: "alert" });
    expect(requests[0]).toMatchObject({ method: "post", url: "/alerts/a%2Fb/acknowledge" });
    expect(requests[0].data).toBeUndefined();
    expect(await resolveAlert("a/b", "false_positive", "  mistaken identity  ")).toEqual({ id: "alert" });
    expect(requests[1].url).toBe("/alerts/a%2Fb/resolve");
    expect(JSON.parse(requests[1].data)).toEqual({ disposition: "false_positive", note: "mistaken identity" });
    await resolveAlert("a", "true_positive", "  ");
    expect(JSON.parse(requests[2].data)).toEqual({ disposition: "true_positive" });
  });

  it("accepts a 1000-character note and rejects 1001 before HTTP", async () => {
    await resolveAlert("a", "true_positive", "x".repeat(1000));
    await expect(resolveAlert("a", "true_positive", "x".repeat(1001))).rejects.toThrow("at most 1000");
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("fetches JPEG evidence using Bearer authentication, not a direct image URL", async () => {
    localStorage.setItem("token", "regression-test-token");
    const signal = new AbortController().signal;
    const jpeg = new Blob(["jpeg"], { type: "image/jpeg; charset=binary" });
    responseData = jpeg;
    expect(await getAlertSnapshot("id/a", signal)).toBe(jpeg);
    expect(requests[0]).toMatchObject({ url: "/alerts/id%2Fa/snapshot", responseType: "blob", signal });
    expect(requests[0].headers.get("Authorization")).toBe("Bearer regression-test-token");
    expect(requests[0].headers.get("Accept")).toBe("image/jpeg");
  });

  it.each([["application/json", "{}"], ["image/png", "png"], ["image/jpeg", ""]])("rejects invalid snapshot type/body (%s)", async (type, body) => {
    responseData = new Blob([body], { type });
    await expect(getAlertSnapshot("a")).rejects.toThrow("JPEG snapshot");
  });
});

function httpError(status: number) {
  return new AxiosError("request failed", "ERR_BAD_RESPONSE", undefined, undefined, {
    status, statusText: "error", data: {}, headers: {}, config: { headers: new AxiosHeaders() },
  });
}

describe("bounded alert retry policy", () => {
  it.each([404, 500, 503])("allows only two retries for HTTP %i", (status) => {
    expect([0, 1, 2, 3].map((count) => retryAlertRead(count, httpError(status)))).toEqual([true, true, false, false]);
  });
  it.each([400, 401, 403, 422, 429])("never retries HTTP %i", (status) => {
    expect(retryAlertRead(0, httpError(status))).toBe(false);
    expect(alertErrorMessage(httpError(status))).not.toBe("request failed");
  });
  it("retries network failures but not cancellation or local validation errors", () => {
    expect(retryAlertRead(0, new AxiosError("offline", "ERR_NETWORK"))).toBe(true);
    expect(retryAlertRead(2, new AxiosError("offline", "ERR_NETWORK"))).toBe(false);
    expect(retryAlertRead(0, new CanceledError())).toBe(false);
    expect(retryAlertRead(0, new Error("Invalid JPEG"))).toBe(false);
  });
});