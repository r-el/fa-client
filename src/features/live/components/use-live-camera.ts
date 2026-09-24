import { useCallback, useEffect, useState } from "react";
import type { ICamera } from "../../../@types/Camera";
import { getLiveCamera, liveFailure } from "../api/live";

export function useLiveCamera(cameraId: string) {
  const [camera, setCamera] = useState<ICamera>();
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setCamera(undefined);
    setError(undefined);
    void getLiveCamera(cameraId, controller.signal).then((data) => {
      if (!cancelled) setCamera(data);
    }).catch((failure: unknown) => {
      if (!cancelled) setError(liveFailure(failure).message);
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cameraId, attempt]);

  return { camera, error, retry };
}