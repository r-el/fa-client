import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@/services/api";
import { buildPhotoForm, normalizeCreatedTargets, watchlistsService } from "./watchlists";
import { MAX_PHOTO_BYTES, parseMetadata, validatePhotos } from "@/components/watchlists/utils";
import type { Target, TargetSpecification, WatchlistInput } from "@/components/watchlists/types";

vi.mock("@/services/api", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }));

const photo = (name = "portrait.jpg", type = "image/jpeg", size = 1) =>
  new File([new Uint8Array(size)], name, { type });
const specification = (names: string[]): TargetSpecification => ({ label: "Alex", metadata: { team: "ops" }, image_file_names: names });
const target: Target = {
  id: "target", watchlist_id: "list", label: "Alex", target_type: "person", is_enabled: true,
  metadata: {}, enrollment_batch_id: "batch", enrollment_status: "queued", reference_images: [],
};

beforeEach(() => vi.resetAllMocks());

describe("watchlist HTTP contracts", () => {
  it("unwraps list, targets and batch envelopes and forwards cancellation", async () => {
    const signal = new AbortController().signal;
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [target] } });
    expect(await watchlistsService.list(signal)).toEqual([target]);
    expect(await watchlistsService.targets("list/a", signal)).toEqual([target]);
    expect(await watchlistsService.enrollmentBatch("batch/a", signal)).toEqual([target]);
    expect(vi.mocked(api.get).mock.calls).toEqual([
      ["/watchlists", { signal }], ["/watchlists/list%2Fa/targets", { signal }],
      ["/enrollment-batches/batch%2Fa", { signal }],
    ]);
  });

  it.each([
    [{ success: false, error: "Duplicate name", message: "fallback" }, "Duplicate name"],
    [{ success: false, message: "Not permitted" }, "Not permitted"],
    [{ success: false }, "Request failed."],
  ])("rejects failure envelopes instead of treating them as data: %j", async (body, message) => {
    vi.mocked(api.get).mockResolvedValue({ data: body });
    await expect(watchlistsService.list()).rejects.toThrow(message);
  });

  it("sends watchlist and target JSON updates without changing fields", async () => {
    const body: WatchlistInput = { name: "Staff", kind: "watchlist", target_type: "person", metadata: {}, face_match_threshold_ratio: 0.45, appearance_match_threshold_ratio: 0.75 };
    const created = { ...body, id: "list", owner_id: "owner" };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: created } });
    vi.mocked(api.patch).mockResolvedValue({ data: { success: true, data: target } });
    expect(await watchlistsService.create(body)).toEqual(created);
    expect(api.post).toHaveBeenCalledWith("/watchlists", body);
    await watchlistsService.update("list/a", { name: "Renamed", metadata: { site: 2 } });
    expect(api.patch).toHaveBeenCalledWith("/watchlists/list%2Fa", { name: "Renamed", metadata: { site: 2 } });
    const update = { label: "Updated", metadata: {}, is_enabled: false };
    expect(await watchlistsService.updateTarget("list/a", "target?#", update)).toEqual(target);
    expect(api.patch).toHaveBeenCalledWith("/watchlists/list%2Fa/targets/target%3F%23", update);
  });

  it("accepts the server's message-only delete envelopes and encodes every path segment", async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true, message: "Deleted" } });
    await expect(watchlistsService.remove("a/b")).resolves.toBeUndefined();
    await expect(watchlistsService.removeTarget("a/b", "c?d")).resolves.toBeUndefined();
    await expect(watchlistsService.removePhoto("a/b", "c?d", "e#f")).resolves.toBeUndefined();
    expect(vi.mocked(api.delete).mock.calls).toEqual([
      ["/watchlists/a%2Fb"], ["/watchlists/a%2Fb/targets/c%3Fd"],
      ["/watchlists/a%2Fb/targets/c%3Fd/images/e%23f"],
    ]);
  });

  it("downloads protected photos through the API as blobs with an abort signal", async () => {
    const blob = new Blob(["image"], { type: "image/png" });
    const signal = new AbortController().signal;
    vi.mocked(api.get).mockResolvedValue({ data: blob });
    expect(await watchlistsService.photo("a/b", "c?d", "e#f", signal)).toBe(blob);
    expect(api.get).toHaveBeenCalledWith("/watchlists/a%2Fb/targets/c%3Fd/images/e%23f", { responseType: "blob", signal });
  });
});

describe("multipart enrollment", () => {
  it.each(["array", "envelope"])("accepts the %s response and preserves named images with a browser-generated boundary", async (shape) => {
    const files = [photo("front view.jpg"), photo("צד.png", "image/png")];
    const targets = [specification([files[1].name]), { ...specification([files[0].name]), label: "Sam" }];
    const result = { enrollment_batch_id: "batch", targets: [target] };
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: shape === "array" ? [target] : result } });
    expect(await watchlistsService.createTargets("a/b", targets, files)).toEqual(result);
    const [path, body, config] = vi.mocked(api.post).mock.calls[0];
    expect(path).toBe("/watchlists/a%2Fb/targets");
    expect(body).toBeInstanceOf(FormData);
    const form = body as FormData;
    expect(JSON.parse(form.get("targets") as string)).toEqual(targets);
    expect((form.getAll("images") as File[]).map((file) => [file.name, file.type, file.size])).toEqual(files.map((file) => [file.name, file.type, file.size]));
    expect(Array.from(form.keys())).toEqual(["targets", "images", "images"]);
    // Never hard-code multipart/form-data: that omits the browser's boundary.
    expect(config).toEqual({ headers: { "Content-Type": undefined } });
    expect(Object.hasOwn(config!.headers!, "Content-Type")).toBe(true);
  });

  it("adds images without a targets field, also clearing the shared JSON Content-Type", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: target } });
    expect(await watchlistsService.addPhotos("list", "target", [photo()])).toEqual(target);
    const [path, body, config] = vi.mocked(api.post).mock.calls[0];
    expect(path).toBe("/watchlists/list/targets/target/images");
    expect(body).toBeInstanceOf(FormData);
    const form = body as FormData;
    expect(Array.from(form.keys())).toEqual(["images"]);
    expect(config).toEqual({ headers: { "Content-Type": undefined } });
  });

  it("allows creating a target without photos but not an empty image upload", async () => {
    expect(buildPhotoForm([], [specification([])]).getAll("images")).toEqual([]);
    expect(normalizeCreatedTargets([])).toEqual({ enrollment_batch_id: null, targets: [] });
    await expect(watchlistsService.addPhotos("list", "target", [])).rejects.toThrow("Select at least one photo");
    expect(api.post).not.toHaveBeenCalled();
  });

  it.each([
    [[], "Every target needs a label"],
    [[{ ...specification(["portrait.jpg"]), label: "  " }], "Every target needs a label"],
    [[specification(["missing.jpg"])], "exactly one target"],
    [[specification([])], "exactly one target"],
    [[specification(["portrait.jpg"]), specification(["portrait.jpg"])], "exactly one target"],
  ])("rejects invalid named-image mappings before HTTP: %j", async (targets, message) => {
    await expect(watchlistsService.createTargets("list", targets, [photo()])).rejects.toThrow(message);
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("upload and metadata validation limits", () => {
  it.each([
    [() => [photo("a.jpg"), photo("a.jpg")], "Duplicate file name"],
    [() => [photo(" ")], "file name"],
    [() => [photo("a.gif", "image/gif")], "JPEG, PNG or WebP"],
    [() => [photo("a.jpg", "image/jpeg", 0)], "empty"],
    [() => [photo("a.jpg", "image/jpeg", MAX_PHOTO_BYTES + 1)], "exceeds 10 MiB"],
    [() => Array.from({ length: 21 }, (_, i) => photo(`${i}.jpg`)), "at most 20"],
  ])("rejects invalid photos before making a request (%#)", async (files, message) => {
    await expect(watchlistsService.addPhotos("list", "target", files())).rejects.toThrow(message);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("accepts exactly 20 photos and exactly 10 MiB, including all supported MIME types", () => {
    expect(validatePhotos(Array.from({ length: 20 }, (_, i) => photo(`${i}.jpg`)))).toBeUndefined();
    expect(validatePhotos([photo("max.jpg", "image/jpeg", MAX_PHOTO_BYTES), photo("a.png", "image/png"), photo("a.webp", "image/webp")])).toBeUndefined();
  });

  it.each(["null", "[]", "42", '"text"', "true", "not json"])("rejects non-object metadata: %s", (text) => {
    expect(() => parseMetadata(text)).toThrow();
  });

  it("preserves nested metadata objects", () => {
    expect(parseMetadata('{"tags":["one"],"nested":{"enabled":true}}')).toEqual({ tags: ["one"], nested: { enabled: true } });
  });
});