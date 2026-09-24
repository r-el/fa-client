import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { requestLiveSocketUrl } from "@/services/live";
import { MAX_PENDING_SEGMENTS } from "./live-protocol";
import { startMseSession } from "./mse-session";

vi.mock("@/services/live", async (original) => ({
  ...await original<typeof import("@/services/live")>(), requestLiveSocketUrl: vi.fn(),
}));

class FakeSourceBuffer extends EventTarget {
  updating = false;
  mode = "";
  buffered = { length: 0, start: () => 0, end: () => 0 };
  appendBuffer = vi.fn<(segment: ArrayBuffer) => void>(() => { this.updating = true; });
  remove = vi.fn<(start: number, end: number) => void>(() => { this.updating = true; });
  abort = vi.fn(() => { this.updating = false; });
  finish() { this.updating = false; this.dispatchEvent(new Event("updateend")); }
}

class FakeMediaSource extends EventTarget {
  static instances: FakeMediaSource[] = [];
  static isTypeSupported = vi.fn(() => true);
  readyState = "closed";
  source = new FakeSourceBuffer();
  addSourceBuffer = vi.fn<(mime: string) => FakeSourceBuffer>(() => this.source);
  removeSourceBuffer = vi.fn();
  constructor() { super(); FakeMediaSource.instances.push(this); }
  open() { this.readyState = "open"; this.dispatchEvent(new Event("sourceopen")); }
}

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 1;
  binaryType = "";
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  url: string;
  constructor(url: string) { this.url = url; FakeSocket.instances.push(this); }
  message(data: unknown) { this.onmessage?.({ data }); }
}

let video: HTMLVideoElement;
let dispose: (() => void) | undefined;
const onState = vi.fn();
const onFailure = vi.fn();
const revoke = vi.fn();
const mime = 'video/mp4; codecs="avc1.640029"';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  FakeMediaSource.instances = [];
  FakeSocket.instances = [];
  FakeMediaSource.isTypeSupported.mockReturnValue(true);
  vi.stubGlobal("MediaSource", FakeMediaSource);
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:synthetic-mse");
    static revokeObjectURL = revoke;
  });
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.mocked(requestLiveSocketUrl).mockResolvedValue("wss://api.example/base/api/cameras/cam-1/live/mse?ticket=synthetic");
  video = document.createElement("video");
});
afterEach(() => { dispose?.(); dispose = undefined; vi.unstubAllGlobals(); vi.useRealTimers(); });

async function connect(negotiate = true) {
  dispose = startMseSession("cam-1", video, onState, onFailure);
  const media = FakeMediaSource.instances[0];
  media.open();
  await Promise.resolve();
  const socket = FakeSocket.instances[0];
  socket.onopen?.();
  if (negotiate) socket.message(JSON.stringify({ type: "mse", value: mime }));
  return { media, socket, source: media.source };
}

it("negotiates codecs and serializes FIFO fragments across updateend events", async () => {
  const { media, socket, source } = await connect();
  expect(socket.binaryType).toBe("arraybuffer");
  expect(JSON.parse(socket.send.mock.calls[0][0])).toMatchObject({ type: "mse", value: expect.stringContaining("avc1") });
  expect(media.addSourceBuffer).toHaveBeenCalledWith(mime);
  expect(source.mode).toBe("segments");
  const first = new ArrayBuffer(4);
  const second = new ArrayBuffer(8);
  socket.message(first);
  socket.message(second);
  expect(source.appendBuffer.mock.calls).toEqual([[first]]);
  source.finish();
  expect(source.appendBuffer.mock.calls).toEqual([[first], [second]]);
  source.finish();
  expect(onFailure).not.toHaveBeenCalled();
});

it("quota recovery evicts then retries exactly the rejected head before later segments", async () => {
  const { socket, source } = await connect();
  source.buffered = { length: 1, start: () => 0, end: () => 12 };
  video.currentTime = 10;
  source.appendBuffer.mockImplementationOnce(() => { throw new DOMException("full", "QuotaExceededError"); });
  const first = new ArrayBuffer(4);
  const second = new ArrayBuffer(8);
  socket.message(first);
  socket.message(second);
  expect(source.remove).toHaveBeenCalledWith(0, 8);
  expect(source.appendBuffer.mock.calls).toEqual([[first]]);
  source.finish();
  expect(source.appendBuffer.mock.calls).toEqual([[first], [first]]);
  source.finish();
  expect(source.appendBuffer.mock.calls).toEqual([[first], [first], [second]]);
  expect(onFailure).not.toHaveBeenCalled();
});

it("queue overflow closes rather than dropping MP4 fragments", async () => {
  const { socket, source } = await connect();
  socket.message(new ArrayBuffer(1));
  for (let index = 0; index <= MAX_PENDING_SEGMENTS; index += 1) socket.message(new ArrayBuffer(1));
  expect(onFailure).toHaveBeenCalledExactlyOnceWith({ message: expect.stringContaining("faster"), retryable: true });
  expect(source.appendBuffer).toHaveBeenCalledOnce();
  expect(socket.close).toHaveBeenCalledOnce();
});

it("cleanup aborts requests, detaches handlers, revokes media and is idempotent", async () => {
  const { media, socket, source } = await connect();
  socket.message(new ArrayBuffer(1));
  const signal = vi.mocked(requestLiveSocketUrl).mock.calls[0][1];
  dispose!();
  dispose!();
  expect(signal.aborted).toBe(true);
  expect(source.abort).toHaveBeenCalledOnce();
  expect(media.removeSourceBuffer).toHaveBeenCalledWith(source);
  expect(socket.close).toHaveBeenCalledOnce();
  expect([socket.onopen, socket.onmessage, socket.onerror, socket.onclose]).toEqual([null, null, null, null]);
  expect(video.hasAttribute("src")).toBe(false);
  expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:synthetic-mse");
  expect(vi.getTimerCount()).toBe(0);
  source.dispatchEvent(new Event("error"));
  video.dispatchEvent(new Event("error"));
  media.dispatchEvent(new Event("sourceclose"));
  expect(onFailure).not.toHaveBeenCalled();
});

it("late ticket completion after disposal cannot create a WebSocket", async () => {
  let resolve!: (url: string) => void;
  vi.mocked(requestLiveSocketUrl).mockReturnValue(new Promise((done) => { resolve = done; }));
  dispose = startMseSession("cam-1", video, onState, onFailure);
  FakeMediaSource.instances[0].open();
  dispose();
  resolve("wss://api.example/live?ticket=late");
  await Promise.resolve();
  expect(FakeSocket.instances).toHaveLength(0);
  expect(onFailure).not.toHaveBeenCalled();
});

it("unsupported browsers fail safely before requesting tickets", () => {
  FakeMediaSource.isTypeSupported.mockReturnValue(false);
  dispose = startMseSession("cam-1", video, onState, onFailure);
  expect(onFailure).toHaveBeenCalledWith({ message: expect.stringContaining("not supported"), retryable: false });
  expect(requestLiveSocketUrl).not.toHaveBeenCalled();
});

it.each(["invalid JSON", '{"type":"error","value":"rtsp://fake:synthetic@private"}', '{"type":"mse","value":"text/html"}'])(
  "rejects invalid description %# without exposing relay details", async (description) => {
    const { socket } = await connect(false);
    socket.message(description);
    expect(onFailure).toHaveBeenCalledExactlyOnceWith({ message: expect.stringContaining("compatible MSE"), retryable: false });
    expect(onFailure.mock.calls[0][0].message).not.toMatch(/synthetic|private|rtsp/);
  },
);

it("rejects binary video before codec negotiation", async () => {
  const { socket } = await connect(false);
  socket.message(new ArrayBuffer(1));
  expect(onFailure).toHaveBeenCalledWith({ message: expect.stringContaining("before negotiating"), retryable: false });
});

it.each([[1008, false], [1011, true], [1006, true]] as const)("socket close %s has correct retry policy", async (code, retryable) => {
  const { socket } = await connect();
  socket.onclose?.({ code });
  expect(onFailure).toHaveBeenCalledWith({ message: expect.any(String), retryable });
});

it.each(["source", "video", "socket"] as const)("handles %s errors with cleanup", async (target) => {
  const { socket, source } = await connect();
  if (target === "source") source.dispatchEvent(new Event("error"));
  if (target === "video") video.dispatchEvent(new Event("error"));
  if (target === "socket") socket.onerror?.();
  expect(onFailure).toHaveBeenCalledExactlyOnceWith({ message: expect.any(String), retryable: target !== "video" });
  expect(socket.close).toHaveBeenCalledOnce();
  expect(revoke).toHaveBeenCalledOnce();
});

it("watchdog detects a stalled stream and disposes its interval", async () => {
  await connect();
  await vi.advanceTimersByTimeAsync(16_000);
  expect(onFailure).toHaveBeenCalledWith({ message: expect.stringContaining("stalled"), retryable: true });
  expect(vi.getTimerCount()).toBe(0);
});

it("blocked autoplay becomes paused rather than a failed stream", async () => {
  await connect();
  vi.mocked(video.play).mockRejectedValue(new Error("autoplay blocked"));
  video.dispatchEvent(new Event("loadeddata"));
  await Promise.resolve();
  expect(onState).toHaveBeenLastCalledWith({ phase: "paused", message: expect.stringContaining("Press Play") });
  video.dispatchEvent(new Event("playing"));
  expect(onState).toHaveBeenLastCalledWith({ phase: "playing", message: "Live video · MSE" });
  expect(onFailure).not.toHaveBeenCalled();
});