import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play, Settings, Square, Trash2, Video } from "lucide-react";
import { useCameraMutations } from "@/features/cameras/hooks/use-cameras";
import { cameraError, type CameraAction, type CameraDetails } from "@/features/cameras/api/cameras";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ListedCamera = CameraDetails;
const REQUEST_CONFIRMATION_MS = 30_000;
const statusStyles: Record<string, string> = {
  running: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  starting: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  reconnecting: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  stopped: "border-white/10 bg-white/5 text-muted-foreground",
  failed: "border-rose-500/30 bg-rose-500/10 text-rose-400",
};

export function CameraCard({ camera, role, onEdit }: {
  camera: ListedCamera;
  role?: string;
  onEdit: () => void;
}) {
  const { control, remove } = useCameraMutations();
  const [confirmation, setConfirmation] = useState<"stop" | "delete" | null>(null);
  const [request, setRequest] = useState<{ action: CameraAction; at: number; initialStatus: string; finished: boolean } | null>(null);
  const [expiredAt, setExpiredAt] = useState<number | null>(null);
  // A missing live status is unknown, not the desired state (nor "offline").
  const status = camera.live_status ?? "unknown";
  const canManage = (role === "admin" || role === "operator") && camera.canManage !== false;
  const reachedTerminalStatus = request?.action === "start"
    ? status === "running" || (status === "failed" && request.initialStatus !== "failed")
    : status === "stopped";
  // Latch observed completion so a later reconnect cannot revive an old pending request.
  // A pre-existing failure is not confirmation of the newly accepted start request.
  if (request && !request.finished && reachedTerminalStatus) {
    setRequest({ ...request, finished: true });
  }
  const isConfirmed = request?.finished || reachedTerminalStatus;
  const isAwaitingStatus = Boolean(request && !isConfirmed && expiredAt !== request.at);
  const isBusy = control.isPending || remove.isPending || isAwaitingStatus;

  useEffect(() => {
    if (!request) return;
    const timer = window.setTimeout(() => setExpiredAt(request.at), REQUEST_CONFIRMATION_MS);
    return () => window.clearTimeout(timer);
  }, [request]);

  async function requestControl(action: CameraAction) {
    try {
      await control.mutateAsync({ id: camera.id, action });
      setRequest({ action, at: Date.now(), initialStatus: status, finished: false });
      setConfirmation(null);
    } catch {
      // Errors remain visible and confirmations stay open for retry.
    }
  }

  async function confirm() {
    if (confirmation === "stop") return requestControl("stop");
    try {
      await remove.mutateAsync(camera.id);
      setConfirmation(null);
    } catch {
      // The mutation provides both a toast and an inline error.
    }
  }

  const actionError = control.error || remove.error;
  return (
    <Card className="rounded-2xl border-white/10 bg-white/5">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <Video className="h-6 w-6 text-primary" aria-hidden="true" />
          <Badge variant="outline" className={statusStyles[status] ?? statusStyles.stopped}>{status || "unknown"}</Badge>
        </div>
        <CardTitle className="break-words pt-2 text-xl">{camera.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{camera.location || "No location specified"}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground">Camera ID <span className="break-all font-mono">{camera.id}</span></div>
        {camera.desired_state && <p className="text-xs text-muted-foreground">Requested state: {camera.desired_state} (not a live status)</p>}
        {request && !isConfirmed && <p role="status" className="text-sm text-amber-400">
          {isAwaitingStatus
            ? `${request.action === "start" ? "Start" : "Stop"} accepted — waiting for reported status…`
            : "The request was accepted, but its outcome is not yet confirmed. Refresh status before retrying."}
        </p>}
        {Boolean(actionError) && <p role="alert" className="text-sm text-rose-400">{cameraError(actionError)}</p>}
        <Button asChild variant="outline" className="w-full">
          <Link to={`/cameras/${encodeURIComponent(camera.id)}/live`}><Video className="mr-2 h-4 w-4" />Live view</Link>
        </Button>
        {canManage && <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={isBusy || ["running", "starting", "reconnecting"].includes(status)}
            onClick={() => void requestControl("start")}>
            <Play className="mr-1 h-4 w-4" />{control.isPending && control.variables?.action === "start" ? "Requesting…" : "Start"}
          </Button>
          <Button size="sm" variant="outline" disabled={isBusy || status === "stopped"} onClick={() => { control.reset(); setConfirmation("stop"); }}>
            <Square className="mr-1 h-4 w-4" />Stop
          </Button>
          <Button size="sm" variant="outline" disabled={isBusy} onClick={onEdit}><Settings className="mr-1 h-4 w-4" />Edit</Button>
          {role === "admin" && <Button size="sm" variant="destructive" disabled={isBusy} onClick={() => { remove.reset(); setConfirmation("delete"); }}>
            <Trash2 className="mr-1 h-4 w-4" />Delete
          </Button>}
        </div>}
        <Dialog open={confirmation !== null} onOpenChange={(open) => { if (!open && !control.isPending && !remove.isPending) setConfirmation(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmation === "delete" ? "Delete camera?" : "Stop camera?"}</DialogTitle>
              <DialogDescription>
                {confirmation === "delete"
                  ? `Permanently delete “${camera.name}” and its camera assignments? This cannot be undone.`
                  : `Request stopping “${camera.name}”? Monitoring will stop when the request is applied.`}
              </DialogDescription>
            </DialogHeader>
            {Boolean(actionError) && <p role="alert" className="text-sm text-rose-400">{cameraError(actionError)}</p>}
            <DialogFooter>
              <Button variant="outline" disabled={control.isPending || remove.isPending} onClick={() => setConfirmation(null)}>Cancel</Button>
              <Button variant="destructive" disabled={control.isPending || remove.isPending} onClick={() => void confirm()}>
                {control.isPending || remove.isPending ? "Requesting…" : confirmation === "delete" ? "Delete camera" : "Request stop"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}