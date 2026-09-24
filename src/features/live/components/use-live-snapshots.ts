import { useCallback, useEffect, useState } from "react";
import { getLiveFrame, liveFailure } from "../api/live";

interface SnapshotState {
  url?: string;
  receivedAt?: number;
  phase: "loading" | "ready" | "error";
  message: string;
}

export function useLiveSnapshots(cameraId: string, enabled: boolean) {
  const [state, setState] = useState<SnapshotState>({ phase: "loading", message: "Fetching snapshot…" });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let currentUrl: string | undefined;
    let pendingUrl: string | undefined;
    let image: HTMLImageElement | undefined;
    let failures = 0;
    setState({ phase: "loading", message: "Fetching snapshot…" });

    async function poll() {
      try {
        const frame = await getLiveFrame(cameraId, controller.signal);
        if (cancelled) return;
        pendingUrl = URL.createObjectURL(frame);
        image = new Image();
        image.src = pendingUrl;
        await image.decode();
        if (cancelled) return;
        const previousUrl = currentUrl;
        currentUrl = pendingUrl;
        pendingUrl = undefined;
        failures = 0;
        setState({ url: currentUrl, receivedAt: Date.now(), phase: "ready", message: "JPEG snapshots · not continuous video" });
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        // Schedule after completion, never overlapping requests or image decodes.
        timer = setTimeout(() => void poll(), 2000);
      } catch (error) {
        if (cancelled) return;
        if (pendingUrl) URL.revokeObjectURL(pendingUrl);
        pendingUrl = undefined;
        const failure = liveFailure(error);
        failures += 1;
        const willRetry = failure.retryable && failures <= 3;
        setState((previous) => ({
          ...previous, phase: "error",
          message: `${failure.message}${willRetry ? " Retrying snapshots…" : " Use Retry snapshots to try again."}`,
        }));
        if (willRetry) timer = setTimeout(() => void poll(), 1000 * 2 ** failures);
      }
    }

    void poll();
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      if (image) image.src = "";
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    };
  }, [cameraId, enabled, attempt]);

  return { state, retry };
}