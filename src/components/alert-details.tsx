import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAlert, useAlertActions, useAlertSnapshot } from "@/hooks/use-alerts";
import { alertErrorMessage } from "@/services/alerts";
import type { AlertResolution, SpecterAlert } from "@/services/alerts";
import { formatDateTime } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const label = (value: string | null | undefined) => value ? value.replaceAll("_", " ") : "—";
const ratio = (value: number | null) => value == null ? "—" : `${(value * 100).toFixed(2)}%`;

function Detail({ title, children }: { title: string; children: ReactNode }) {
  return <div className="min-w-0"><dt className="text-xs uppercase tracking-wide text-muted-foreground">{title}</dt><dd className="mt-1 break-words text-sm">{children ?? "—"}</dd></div>;
}

function AlertSnapshot({ alert }: { alert: SpecterAlert }) {
  const snapshot = useAlertSnapshot(alert.id, alert.has_snapshot);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!alert.has_snapshot) {
    return <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 text-muted-foreground"><ImageIcon aria-hidden="true" /><p>No snapshot was recorded for this alert.</p></div>;
  }
  if (snapshot.isError || (snapshot.url && failedUrl === snapshot.url)) {
    return <div role="alert" className="space-y-3 rounded-xl border border-destructive/30 p-6"><p>{snapshot.isError ? `Snapshot: ${alertErrorMessage(snapshot.error)}` : "The snapshot could not be displayed."}</p><p className="text-sm text-muted-foreground">Evidence may still be arriving, have expired, or be inaccessible. Automatic retries are limited.</p><Button variant="outline" disabled={snapshot.isFetching} onClick={() => { void snapshot.refetch(); }}>Retry snapshot</Button></div>;
  }
  if (!snapshot.url) return <p role="status" className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" />Loading protected snapshot…</p>;
  return <img src={snapshot.url} onError={() => setFailedUrl(snapshot.url)} alt={`Evidence for ${alert.kind === "identity_match" ? alert.target_label || alert.target_id || "identity match" : label(alert.rule_kind)}`} className="max-h-[50vh] w-full rounded-xl border border-white/10 bg-black object-contain" />;
}

export function AlertDetails({ initialAlert, onClose }: { initialAlert: SpecterAlert; onClose: () => void }) {
  const { user } = useAuth();
  const query = useAlert(initialAlert.id);
  const alert = query.data ?? initialAlert;
  const { acknowledge, resolve } = useAlertActions();
  const [confirmation, setConfirmation] = useState<"acknowledge" | AlertResolution | null>(null);
  const [note, setNote] = useState(alert.review.note ?? "");
  const [message, setMessage] = useState("");
  const noteId = useId();
  const canResolve = user?.role === "admin" || user?.role === "operator";
  const pending = acknowledge.isPending || resolve.isPending;
  const mutationError = acknowledge.error || resolve.error;
  const noteLength = Array.from(note).length;

  function confirm(action: "acknowledge" | AlertResolution) {
    acknowledge.reset();
    resolve.reset();
    setMessage("");
    setNote(alert.review.note ?? "");
    setConfirmation(action);
  }

  async function submit() {
    if (!confirmation || pending || query.isError) return;
    try {
      if (confirmation === "acknowledge") {
        await acknowledge.mutateAsync(alert.id);
        setMessage("Alert acknowledged.");
      } else {
        if (!canResolve || noteLength > 1000) return;
        await resolve.mutateAsync({ id: alert.id, disposition: confirmation, note });
        setMessage(`Alert resolved as ${label(confirmation)}.`);
      }
      setConfirmation(null);
    } catch {
      // Keep the confirmation open with the mutation's error and the user's note.
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto border-white/10">
        <DialogHeader>
          <DialogTitle>{alert.kind === "identity_match" ? "Identity match" : "Rule alert"}: {alert.target_label || alert.rule_kind?.replaceAll("_", " ") || alert.target_id || alert.id}</DialogTitle>
          <DialogDescription>Created {formatDateTime(alert.created_at)} · {alert.camera_name || alert.camera_id}</DialogDescription>
        </DialogHeader>
        {query.isFetching && <p role="status" className="text-sm text-muted-foreground">Refreshing alert details…</p>}
        {query.isError && <div role="alert" className="space-y-2 rounded-lg border border-destructive/30 p-3 text-sm"><p>{alertErrorMessage(query.error)} Showing the last known alert; review actions are disabled.</p><Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => { void query.refetch(); }}>Retry details</Button></div>}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{label(alert.review.disposition)}</Badge>
          <Badge variant="secondary">{alert.review.is_acknowledged ? "Acknowledged" : "Not acknowledged"}</Badge>
        </div>
        <Tabs defaultValue="details">
          <TabsList className="mb-4"><TabsTrigger value="details">Details</TabsTrigger><TabsTrigger value="snapshot">Snapshot</TabsTrigger><TabsTrigger value="raw">Raw data</TabsTrigger></TabsList>
          <TabsContent value="details" className="space-y-5">
            <dl className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
              <Detail title="Alert ID">{alert.id}</Detail>
              <Detail title="Camera ID">{alert.camera_id}</Detail>
              <Detail title="Track ID">{alert.track_id}</Detail>
              <Detail title="Object class">{alert.object_class}</Detail>
              <Detail title="Frame captured">{formatDateTime(alert.frame_captured_at)}</Detail>
              <Detail title="Created">{formatDateTime(alert.created_at)}</Detail>
              <Detail title="Bounding box (0–1 fractions)"><span className="font-mono text-xs">x: {alert.bounding_box.x}, y: {alert.bounding_box.y}, width: {alert.bounding_box.width}, height: {alert.bounding_box.height}</span></Detail>
              {alert.kind === "identity_match" ? <>
                <Detail title="Target">{alert.target_label || alert.target_id}</Detail>
                <Detail title="Target ID">{alert.target_id}</Detail>
                <Detail title="Watchlist">{alert.watchlist_name || alert.watchlist_id}</Detail>
                <Detail title="Watchlist ID">{alert.watchlist_id}</Detail>
                <Detail title="Watchlist kind">{label(alert.watchlist_kind)}</Detail>
                <Detail title="Modality">{label(alert.modality)}</Detail>
                <Detail title="Similarity">{ratio(alert.similarity_ratio)}</Detail>
                <Detail title="Margin">{ratio(alert.margin_ratio)}</Detail>
              </> : <>
                <Detail title="Rule ID">{alert.rule_id}</Detail>
                <Detail title="Rule kind">{label(alert.rule_kind)}</Detail>
                <Detail title="Zone ID">{alert.zone_id}</Detail>
                <Detail title="Dwell time">{alert.dwell_seconds == null ? "—" : `${alert.dwell_seconds} s`}</Detail>
                <Detail title="Crossing direction">{label(alert.crossing_direction)}</Detail>
              </>}
            </dl>
            <div className="rounded-xl border border-white/10 p-4"><h3 className="mb-2 text-sm font-medium">Review note</h3><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{alert.review.note || "No review note."}</p></div>
          </TabsContent>
          <TabsContent value="snapshot"><AlertSnapshot key={alert.id} alert={alert} /></TabsContent>
          <TabsContent value="raw"><pre className="max-h-80 overflow-auto rounded-xl bg-black/50 p-4 text-xs text-cyan-300">{JSON.stringify(alert, null, 2)}</pre></TabsContent>
        </Tabs>
        <p role="status" className="text-sm text-muted-foreground">{message}</p>
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <Button variant="outline" disabled={pending || query.isPending || query.isError || alert.review.is_acknowledged} onClick={() => confirm("acknowledge")}>{alert.review.is_acknowledged ? "Acknowledged" : "Acknowledge"}</Button>
          {canResolve && <>
            <Button disabled={pending || query.isPending || query.isError} onClick={() => confirm("true_positive")}>Resolve: true positive</Button>
            <Button variant="outline" disabled={pending || query.isPending || query.isError} onClick={() => confirm("false_positive")}>Resolve: false positive</Button>
          </>}
        </div>
        {!canResolve && <p className="text-xs text-muted-foreground">Viewers can acknowledge alerts. Only operators and admins can resolve them.</p>}
        <Dialog open={confirmation !== null} onOpenChange={(open) => { if (!open && !pending) setConfirmation(null); }}>
          <DialogContent className="max-h-[85dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{confirmation === "acknowledge" ? "Acknowledge this alert?" : `Resolve as ${label(confirmation)}?`}</DialogTitle>
              <DialogDescription>{confirmation === "acknowledge" ? "Mark this alert as seen. This does not change its disposition." : "This updates the alert's review disposition for everyone. Any existing review note will be replaced."}</DialogDescription>
            </DialogHeader>
            {confirmation !== "acknowledge" && <div className="space-y-2">
              <label htmlFor={noteId} className="text-sm font-medium">Review note (optional)</label>
              <textarea id={noteId} value={note} maxLength={1000} disabled={pending} onChange={(event) => setNote(event.target.value)} aria-describedby={`${noteId}-length`} className="min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <p id={`${noteId}-length`} className="text-xs text-muted-foreground">{noteLength}/1000 characters</p>
            </div>}
            {mutationError && <p role="alert" className="text-sm text-destructive">{alertErrorMessage(mutationError)} No automatic write retry was made.</p>}
            {query.isError && <p role="alert" className="text-sm text-destructive">Refresh the alert details before confirming.</p>}
            <DialogFooter>
              <Button variant="outline" disabled={pending} onClick={() => setConfirmation(null)}>Cancel</Button>
              <Button disabled={pending || query.isError || (confirmation !== "acknowledge" && (!canResolve || noteLength > 1000))} onClick={() => { void submit(); }}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}Confirm {confirmation === "acknowledge" ? "acknowledgment" : "resolution"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}