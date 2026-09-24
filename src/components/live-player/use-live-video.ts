import { useCallback, useEffect, useRef, useState } from "react";
import { startMseSession } from "./mse-session";
import type { PlaybackState } from "./mse-session";

const MAX_RETRIES = 3;

export function useLiveVideo(cameraId: string, enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PlaybackState>({ phase: "connecting", message: "Connecting…" });
  const retry = useCallback(() => {
    setState({ phase: "connecting", message: "Connecting with a new live ticket…" });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) return;
    let cancelled = false;
    let retries = 0;
    let stopSession: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (cancelled) return;
      stopSession?.();
      stopSession = startMseSession(cameraId, video!, (next) => {
        if (!cancelled) setState(next);
      }, (failure) => {
        if (cancelled) return;
        if (failure.retryable && retries < MAX_RETRIES) {
          const delay = 1000 * 2 ** retries;
          retries += 1;
          setState({ phase: "retrying", message: `${failure.message} Retry ${retries}/${MAX_RETRIES} in ${delay / 1000}s…` });
          timer = setTimeout(connect, delay);
        } else {
          setState({ phase: "failed", message: failure.message });
        }
      });
    }

    connect();
    return () => {
      // Each effect owns its cancellation flag: StrictMode's second setup cannot revive the first.
      cancelled = true;
      clearTimeout(timer);
      stopSession?.();
    };
  }, [cameraId, enabled, attempt]);

  return { videoRef, state, retry };
}