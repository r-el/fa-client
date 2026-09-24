import assert from "node:assert/strict";
import { test } from "vitest";
import {
  MAX_PENDING_BYTES, MAX_PENDING_SEGMENTS, SegmentQueue,
  buildLiveSocketUrl, parseMseDescription, supportedCodecs,
} from "./live-protocol.ts";

test("relative/proxied API URLs retain their prefix and use the page's secure origin", () => {
  assert.equal(
    buildLiveSocketUrl("/gateway/api/cameras/cam-1/live/mse", "https://viewer.example/cameras/cam-1/live", "one-use"),
    "wss://viewer.example/gateway/api/cameras/cam-1/live/mse?ticket=one-use",
  );
  assert.equal(
    buildLiveSocketUrl("/api/cameras/cam-1/live/mse", "http://localhost:5173/", "one-use"),
    "ws://localhost:5173/api/cameras/cam-1/live/mse?ticket=one-use",
  );
  assert.equal(
    buildLiveSocketUrl("//api.example/api/cameras/cam-1/live/mse", "https://viewer.example/", "one-use"),
    "wss://api.example/api/cameras/cam-1/live/mse?ticket=one-use",
  );
});

test("absolute API URL and ticket encoding cannot introduce extra query parameters", () => {
  const url = new URL(buildLiveSocketUrl(
    "https://api.example/prefix/api/cameras/cam-1/live/mse",
    "https://viewer.example/", "short-lived&token=not-a-token",
  ));
  assert.equal(url.protocol, "wss:");
  assert.equal(url.pathname, "/prefix/api/cameras/cam-1/live/mse");
  assert.deepEqual([...url.searchParams.keys()], ["ticket"]);
  assert.equal(url.searchParams.get("ticket"), "short-lived&token=not-a-token");
});

test("reject mixed content, embedded credentials, fragments, queries and non-HTTP bases", () => {
  for (const requestUrl of [
    "http://api.example/api/live", "https://user:secret@api.example/api/live",
    "https://api.example/api/live?token=secret", "https://api.example/api/live#secret",
    "javascript:alert(1)", "wss://api.example/api/live",
  ]) {
    assert.throws(() => buildLiveSocketUrl(requestUrl, "https://viewer.example/", "ticket"));
  }
  assert.throws(() => buildLiveSocketUrl("/api/live", "https://viewer.example/", ""));
});

test("negotiate only supported go2rtc codecs and require a video codec", () => {
  assert.equal(supportedCodecs((mime) => mime.includes("avc1.640029") || mime.includes("mp4a.40.2")), "avc1.640029,mp4a.40.2");
  assert.equal(supportedCodecs((mime) => mime.includes("mp4a.40.2")), "");
  assert.equal(supportedCodecs(() => false), "");
});

test("accept a supported MP4 description, reject error/malformed/unsupported messages", () => {
  const mime = 'video/mp4; codecs="avc1.640029,mp4a.40.2"';
  assert.equal(parseMseDescription(JSON.stringify({ type: "mse", value: mime }), (value) => value === mime), mime);
  for (const text of [
    "invalid JSON", "null", "[]", '{}', '{"type":"mse","value":42}',
    '{"type":"error","value":"rtsp://secret"}', '{"type":"mse","value":"text/html"}',
  ]) {
    assert.throws(() => parseMseDescription(text, () => true));
  }
  assert.throws(() => parseMseDescription(JSON.stringify({ type: "mse", value: mime }), () => false));
  assert.throws(
    () => parseMseDescription('{"type":"error","value":"rtsp://secret"}', () => true),
    (error: Error) => !error.message.includes("secret"),
  );
});

test("bounded FIFO retains a rejected append for quota recovery without reordering", () => {
  const queue = new SegmentQueue();
  const first = new ArrayBuffer(4);
  const second = new ArrayBuffer(8);
  assert.equal(queue.push(first), true);
  assert.equal(queue.push(second), true);
  assert.equal(queue.peek(), first);
  assert.equal(queue.peek(), first); // append failed: retry exactly the same fragment.
  queue.shift();
  assert.equal(queue.peek(), second);
  queue.clear();
  assert.equal(queue.peek(), undefined);
  assert.equal(queue.push(new ArrayBuffer(MAX_PENDING_BYTES)), true);
  assert.equal(queue.push(new ArrayBuffer(1)), false);
  queue.clear();
  assert.equal(queue.push(new ArrayBuffer(MAX_PENDING_BYTES + 1)), false);
});

test("bound segment count as well as byte count; ignore empty messages", () => {
  const queue = new SegmentQueue();
  for (let index = 0; index < MAX_PENDING_SEGMENTS; index += 1) {
    assert.equal(queue.push(new ArrayBuffer(1)), true);
  }
  assert.equal(queue.push(new ArrayBuffer(0)), true);
  assert.equal(queue.push(new ArrayBuffer(1)), false);
  queue.shift();
  assert.equal(queue.push(new ArrayBuffer(1)), true);
});