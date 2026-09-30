import { describe, expect, it } from "vitest";
import { alertKeys, cameraKeys, dashboardKeys, watchlistKeys } from "./query-keys";

describe("queryKeys factory", () => {
  it("generates camera query keys correctly", () => {
    expect(cameraKeys.all).toEqual(["cameras"]);
    expect(cameraKeys.lists()).toEqual(["cameras"]);
    expect(cameraKeys.detail("cam-123")).toEqual(["cameras", "detail", "cam-123"]);
  });

  it("generates watchlist query keys correctly", () => {
    expect(watchlistKeys.all).toEqual(["watchlists"]);
    expect(watchlistKeys.targets("wl-1")).toEqual(["targets", "wl-1"]);
    expect(watchlistKeys.batch("batch-99")).toEqual(["enrollment-batches", "batch-99"]);
  });

  it("generates alert query keys correctly", () => {
    expect(alertKeys.all).toEqual(["alerts"]);
    expect(alertKeys.detail("alert-1")).toEqual(["alerts", "detail", "alert-1"]);
    expect(alertKeys.snapshot("alert-1")).toEqual(["alerts", "snapshot", "alert-1"]);
    expect(alertKeys.list({ disposition: "true_positive" })).toEqual([
      "alerts",
      "list",
      { disposition: "true_positive" },
    ]);
    expect(alertKeys.summary({})).toEqual(["alerts", "summary", {}]);
  });

  it("generates dashboard query keys correctly", () => {
    expect(dashboardKeys.all).toEqual(["dashboard"]);
    expect(dashboardKeys.stats()).toEqual(["dashboard", "stats"]);
    expect(dashboardKeys.chart(7)).toEqual(["alerts", "chart", 7]);
  });
});
