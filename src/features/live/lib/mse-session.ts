import { requestLiveSocketUrl, liveFailure } from "../api/live";
import type { LiveFailure } from "../api/live";
import {
  LIVE_DELAY_SECONDS, MAX_LAG_SECONDS, RETAIN_SECONDS, SegmentQueue,
  parseMseDescription, supportedCodecs,
} from "./live-protocol";

export interface PlaybackState {
  phase: "connecting" | "buffering" | "playing" | "paused" | "retrying" | "failed";
  message: string;
}

const STALL_TIMEOUT_MS = 15000;

/** One disposable connection. Retries must create a fresh MediaSource and a fresh ticket. */
export function startMseSession(
  cameraId: string,
  video: HTMLVideoElement,
  onState: (state: PlaybackState) => void,
  onFailure: (failure: LiveFailure) => void,
): () => void {
  const controller = new AbortController();
  const queue = new SegmentQueue();
  let disposed = false;
  let media: MediaSource | undefined;
  let source: SourceBuffer | undefined;
  let socket: WebSocket | undefined;
  let objectUrl: string | undefined;
  let watchdog: ReturnType<typeof setInterval> | undefined;
  let lastBinary = Date.now();
  let lastAppend = lastBinary;
  let lastPlayback = lastBinary;
  let previousTime = 0;
  let appending = false;
  let quotaRetried = false;

  function dispose() {
    if (disposed) return;
    disposed = true;
    controller.abort();
    clearInterval(watchdog);
    queue.clear();
    if (socket) {
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      // close() also cancels an in-progress browser WebSocket handshake.
      socket.close();
    }
    media?.removeEventListener("sourceopen", openSocket);
    media?.removeEventListener("sourceclose", onSourceClose);
    source?.removeEventListener("updateend", onUpdateEnd);
    source?.removeEventListener("error", onSourceError);
    video.removeEventListener("error", onVideoError);
    video.removeEventListener("playing", onPlaying);
    video.removeEventListener("pause", onPause);
    video.removeEventListener("waiting", onWaiting);
    video.removeEventListener("loadeddata", play);
    try {
      if (media?.readyState === "open" && source) {
        if (source.updating) source.abort();
        media.removeSourceBuffer(source);
      }
    } catch { /* The browser may already have detached the MediaSource. */ }
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }

  function fail(message: string, retryable = true) {
    if (disposed) return;
    dispose();
    onFailure({ message, retryable });
  }

  function onSourceClose() { fail("The browser detached the live stream."); }
  function onSourceError() { fail("The browser could not append the camera's video."); }
  function onVideoError() { fail("The browser could not decode the camera's video.", false); }
  function onPlaying() {
    if (disposed) return;
    lastPlayback = Date.now();
    onState({ phase: "playing", message: "Live video · MSE" });
  }
  function onPause() {
    if (!disposed) onState({ phase: "paused", message: "Paused — press Play to return to live video." });
  }
  function onWaiting() {
    if (!disposed) onState({ phase: "buffering", message: "Buffering live video…" });
  }
  function play() {
    if (disposed) return;
    void video.play().catch(() => {
      if (!disposed) onState({ phase: "paused", message: "Press Play in the video controls to start playback." });
    });
  }

  function onUpdateEnd() {
    if (disposed) return;
    if (appending) lastAppend = Date.now();
    appending = false;
    pump();
  }

  function pump() {
    if (disposed || !source || source.updating || media?.readyState !== "open") return;
    try {
      const ranges = source.buffered;
      if (ranges.length) {
        const start = ranges.start(0);
        const end = ranges.end(ranges.length - 1);
        if (video.currentTime < ranges.start(ranges.length - 1) || end - video.currentTime > MAX_LAG_SECONDS) {
          video.currentTime = Math.max(ranges.start(ranges.length - 1), end - LIVE_DELAY_SECONDS);
        }
        const removeBefore = Math.min(end - RETAIN_SECONDS, video.currentTime - 2);
        if (removeBefore > start + 1) {
          source.remove(start, removeBefore);
          return; // remove and append are both asynchronous, serialized by updateend.
        }
      }
      const segment = queue.peek();
      if (!segment) return;
      try {
        source.appendBuffer(segment);
        appending = true;
        queue.shift();
        quotaRetried = false;
      } catch (error) {
        if (error instanceof DOMException && error.name === "QuotaExceededError" && !quotaRetried && ranges.length) {
          const removeBefore = Math.min(video.currentTime - 2, ranges.end(ranges.length - 1) - 2);
          if (removeBefore > ranges.start(0)) {
            quotaRetried = true;
            source.remove(ranges.start(0), removeBefore);
            return; // Keep the rejected segment at the head until eviction completes.
          }
        }
        fail("The live buffer is full or unavailable. Reconnecting to the live edge.");
      }
    } catch {
      fail("The browser could not update the live buffer.");
    }
  }

  async function openSocket() {
    try {
      const url = await requestLiveSocketUrl(cameraId, controller.signal);
      if (disposed) return;
      socket = new WebSocket(url);
      socket.binaryType = "arraybuffer";
      socket.onopen = () => {
        if (disposed || socket?.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({ type: "mse", value: supportedCodecs((mime) => MediaSource.isTypeSupported(mime)) }));
      };
      socket.onmessage = (event: MessageEvent<unknown>) => {
        if (disposed) return;
        if (typeof event.data === "string") {
          if (source || event.data.length > 4096) {
            fail("The relay returned an unexpected stream description.", false);
            return;
          }
          try {
            const mime = parseMseDescription(event.data, (type) => MediaSource.isTypeSupported(type));
            source = media!.addSourceBuffer(mime);
            source.mode = "segments";
            source.addEventListener("updateend", onUpdateEnd);
            source.addEventListener("error", onSourceError);
            onState({ phase: "buffering", message: "Buffering live video…" });
          } catch {
            fail("No compatible MSE stream is available for this camera and browser.", false);
          }
        } else if (event.data instanceof ArrayBuffer && source) {
          lastBinary = Date.now();
          // The browser WS API has no receive-side pause. Close at the high-water mark,
          // then retry with a new init segment instead of corrupting the MP4 sequence.
          if (!queue.push(event.data)) {
            fail("Video arrived faster than it could play. Reconnecting with a fresh buffer.");
            return;
          }
          pump();
        } else {
          fail("The relay sent video before negotiating its format.", false);
        }
      };
      socket.onerror = () => fail("The live WebSocket could not connect. Check the camera and proxy.");
      socket.onclose = (event) => {
        if (event.code === 1008) fail("Camera access was denied or the camera is not running.", false);
        else fail(event.code === 1011 ? "The upstream camera stream is unavailable." : "The live connection closed.");
      };
    } catch (error) {
      if (disposed) return;
      const failure = liveFailure(error);
      fail(failure.message, failure.retryable);
    }
  }

  onState({ phase: "connecting", message: "Connecting securely to the camera…" });
  if (typeof MediaSource === "undefined" || typeof WebSocket === "undefined" ||
      !supportedCodecs((mime) => MediaSource.isTypeSupported(mime))) {
    fail("MSE video is not supported by this browser. Showing snapshots instead.", false);
    return dispose;
  }
  try {
    media = new MediaSource();
    media.addEventListener("sourceopen", openSocket, { once: true });
    media.addEventListener("sourceclose", onSourceClose);
    video.addEventListener("error", onVideoError);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("loadeddata", play, { once: true });
    objectUrl = URL.createObjectURL(media);
    video.src = objectUrl;
    video.load();
    watchdog = setInterval(() => {
      if (disposed) return;
      const now = Date.now();
      if (video.currentTime !== previousTime) {
        lastPlayback = now;
        previousTime = video.currentTime;
      }
      if (now - lastBinary > STALL_TIMEOUT_MS || now - lastAppend > STALL_TIMEOUT_MS ||
          (!video.paused && now - lastPlayback > STALL_TIMEOUT_MS)) {
        fail("The live stream stalled. The camera may be offline or still starting.");
      }
    }, 1000);
  } catch {
    fail("This browser could not initialize the live video player.", false);
  }
  return dispose;
}