import { useState } from "react";
import { ImageIcon, RefreshCw, Video } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { useLiveVideo } from "./use-live-video";
import { useLiveSnapshots } from "./use-live-snapshots";

export function LivePlayer({ cameraId, cameraName }: { cameraId: string; cameraName: string }) {
  const [snapshotSelected, setSnapshotSelected] = useState(false);
  const live = useLiveVideo(cameraId, !snapshotSelected);
  const isSnapshot = snapshotSelected || live.state.phase === "failed";
  const snapshot = useLiveSnapshots(cameraId, isSnapshot);

  function retryVideo() {
    setSnapshotSelected(false);
    live.retry();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="outline" className={isSnapshot ? "border-amber-400/30 text-amber-400" : "border-primary/30 text-primary"}>
          {isSnapshot ? <ImageIcon className="mr-2 h-3 w-3" /> : <Video className="mr-2 h-3 w-3" />}
          {isSnapshot ? "JPEG snapshots — not live video" : "MSE video"}
        </Badge>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={retryVideo}>
            <RefreshCw className="h-4 w-4" /> {isSnapshot ? "Try live video" : "Reconnect"}
          </Button>
          {isSnapshot ? (
            <Button variant="outline" size="sm" onClick={snapshot.retry}>Retry snapshots</Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setSnapshotSelected(true)}>Use snapshots</Button>
          )}
        </div>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
        {/* Keep the ref mounted while switching modes so effect setup always sees the video. */}
        <video
          ref={live.videoRef}
          className={`h-full w-full object-contain ${isSnapshot ? "hidden" : ""}`}
          autoPlay muted playsInline controls preload="auto"
          aria-label={`Live video from ${cameraName}`}
        />
        {isSnapshot && (snapshot.state.url ? (
          <img src={snapshot.state.url} alt={`Latest JPEG snapshot from ${cameraName}`} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-300">
            {snapshot.state.phase === "error" ? "Snapshot unavailable" : "Fetching the latest snapshot…"}
          </div>
        ))}
        {!isSnapshot && ["connecting", "retrying"].includes(live.state.phase) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-300">
            {live.state.message}
          </div>
        )}
      </div>

      <div role="status" aria-live="polite" className="space-y-2 text-sm text-muted-foreground">
        {!snapshotSelected && (live.state.phase === "failed" || !isSnapshot) && <p>{live.state.message}</p>}
        {isSnapshot && (
          <>
            <p className={snapshot.state.phase === "error" ? "text-amber-400" : ""}>{snapshot.state.message}</p>
            <p>Snapshots refresh about every 2 seconds after each response, without audio. HLS is not exposed by this application server.</p>
            {snapshot.state.receivedAt && (
              <p>
                {snapshot.state.phase === "error" ? "Stale image — last received" : "Last received"}: {new Date(snapshot.state.receivedAt).toLocaleTimeString()}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}