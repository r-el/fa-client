import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAlert, useAlertActions } from "@/features/alerts/hooks/use-alerts";
import { alertErrorMessage } from "@/features/alerts/api/alerts";
import type { AlertResolution, SpecterAlert } from "@/features/alerts/api/alerts";
import { formatDateTime } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertSnapshot } from "./AlertSnapshot";
import { AlertReviewConfirmDialog } from "./AlertReviewConfirmDialog";

const label = (value: string | null | undefined) => (value ? value.replaceAll("_", " ") : "—");
const ratio = (value: number | null) => (value == null ? "—" : `${(value * 100).toFixed(2)}%`);
const modalityLabel = (modality: string | null | undefined) => {
  if (modality === "face") return "Face Recognition";
  if (modality === "appearance") return "Body Re-ID (Appearance)";
  return label(modality);
};

function Detail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{title}</dt>
      <dd className="mt-1 break-words text-sm">{children ?? "—"}</dd>
    </div>
  );
}

function CopyableDetail({ title, value }: { title: string; value: string | null | undefined }) {
  if (!value) return <Detail title={title}>—</Detail>;
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{title}</dt>
      <dd className="mt-1 flex items-center gap-1.5 break-all font-mono text-xs">
        <span className="truncate">{value}</span>
        <CopyButton value={value} label={`Copy ${title}`} />
      </dd>
    </div>
  );
}

export function AlertDetails({ initialAlert, onClose }: { initialAlert: SpecterAlert; onClose: () => void }) {
  const { user } = useAuth();
  const query = useAlert(initialAlert.id);
  const alert = query.data ?? initialAlert;
  const { acknowledge, resolve } = useAlertActions();
  const [confirmation, setConfirmation] = useState<"acknowledge" | AlertResolution | null>(null);
  const [note, setNote] = useState(alert.review.note ?? "");
  const [message, setMessage] = useState("");
  const canResolve = user?.role === "admin" || user?.role === "operator";
  const pending = acknowledge.isPending || resolve.isPending;
  const mutationError = acknowledge.error || resolve.error;

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
        if (!canResolve || Array.from(note).length > 1000) return;
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
          <DialogTitle>
            {alert.kind === "identity_match" ? "Identity match" : "Rule alert"}: {alert.target_label || alert.rule_kind?.replaceAll("_", " ") || alert.target_id || alert.id}
          </DialogTitle>
          <DialogDescription>Created {formatDateTime(alert.created_at)} · {alert.camera_name || alert.camera_id}</DialogDescription>
        </DialogHeader>

        {query.isFetching && <p role="status" className="text-sm text-muted-foreground">Refreshing alert details…</p>}
        {query.isError && (
          <div role="alert" className="space-y-2 rounded-lg border border-destructive/30 p-3 text-sm">
            <p>{alertErrorMessage(query.error)} Showing the last known alert; review actions are disabled.</p>
            <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => { void query.refetch(); }}>Retry details</Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{label(alert.review.disposition)}</Badge>
          <Badge variant="secondary">{alert.review.is_acknowledged ? "Acknowledged" : "Not acknowledged"}</Badge>
        </div>

        <Tabs defaultValue="details">
          <TabsList className="mb-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
            <TabsTrigger value="raw">Raw data</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-5">
            <dl className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
              <Detail title="Camera">{alert.camera_name || alert.camera_id}</Detail>
              <Detail title="Frame captured">{formatDateTime(alert.frame_captured_at)}</Detail>
              <Detail title="Created">{formatDateTime(alert.created_at)}</Detail>
              {alert.kind === "identity_match" ? (
                <>
                  <Detail title="Target">{alert.target_label || alert.target_id}</Detail>
                  <Detail title="Watchlist">{alert.watchlist_name || alert.watchlist_id}</Detail>
                  <Detail title="Watchlist kind">{label(alert.watchlist_kind)}</Detail>
                  <Detail title="Method">{modalityLabel(alert.modality)}</Detail>
                  <Detail title="Similarity">{ratio(alert.similarity_ratio)}</Detail>
                  <Detail title="Object class">{alert.object_class}</Detail>
                </>
              ) : (
                <>
                  <Detail title="Rule">{label(alert.rule_kind)}</Detail>
                  <Detail title="Object class">{alert.object_class}</Detail>
                  <Detail title="Crossing direction">{label(alert.crossing_direction)}</Detail>
                  <Detail title="Dwell time">{alert.dwell_seconds == null ? "—" : `${alert.dwell_seconds} s`}</Detail>
                </>
              )}
            </dl>

            <details className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-colors">
              <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground">
                <span className="flex items-center gap-2">
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  Advanced Technical Details
                </span>
                <span className="text-[11px] opacity-70">IDs, tracking & model diagnostics</span>
              </summary>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs sm:grid-cols-3">
                <CopyableDetail title="Alert ID" value={alert.id} />
                <CopyableDetail title="Camera ID" value={alert.camera_id} />
                <Detail title="Track ID">{alert.track_id}</Detail>
                {alert.kind === "identity_match" ? (
                  <>
                    <CopyableDetail title="Target ID" value={alert.target_id} />
                    <CopyableDetail title="Watchlist ID" value={alert.watchlist_id} />
                    <Detail title="Margin">{ratio(alert.margin_ratio)}</Detail>
                  </>
                ) : (
                  <>
                    <CopyableDetail title="Rule ID" value={alert.rule_id} />
                    <CopyableDetail title="Zone ID" value={alert.zone_id} />
                  </>
                )}
                <Detail title="Bounding box (0–1 fractions)">
                  <span className="font-mono text-xs">x: {alert.bounding_box.x}, y: {alert.bounding_box.y}, w: {alert.bounding_box.width}, h: {alert.bounding_box.height}</span>
                </Detail>
              </dl>
            </details>

            <div className="rounded-xl border border-white/10 p-4">
              <h3 className="mb-2 text-sm font-medium">Review note</h3>
              <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{alert.review.note || "No review note."}</p>
            </div>
          </TabsContent>

          <TabsContent value="snapshot">
            <AlertSnapshot key={alert.id} alert={alert} />
          </TabsContent>

          <TabsContent value="raw">
            <pre className="max-h-80 overflow-auto rounded-xl bg-black/50 p-4 text-xs text-cyan-300 font-mono">{JSON.stringify(alert, null, 2)}</pre>
          </TabsContent>
        </Tabs>

        <p role="status" className="text-sm text-muted-foreground">{message}</p>

        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
          <Button variant="outline" disabled={pending || query.isPending || query.isError || alert.review.is_acknowledged} onClick={() => confirm("acknowledge")}>
            {alert.review.is_acknowledged ? "Acknowledged" : "Acknowledge"}
          </Button>
          {canResolve && (
            <>
              <Button disabled={pending || query.isPending || query.isError} onClick={() => confirm("true_positive")}>
                Resolve: true positive
              </Button>
              <Button variant="outline" disabled={pending || query.isPending || query.isError} onClick={() => confirm("false_positive")}>
                Resolve: false positive
              </Button>
            </>
          )}
        </div>
        {!canResolve && <p className="text-xs text-muted-foreground">Viewers can acknowledge alerts. Only operators and admins can resolve them.</p>}

        <AlertReviewConfirmDialog
          confirmation={confirmation}
          note={note}
          onNoteChange={setNote}
          onClose={() => setConfirmation(null)}
          onConfirm={() => { void submit(); }}
          pending={pending}
          canResolve={canResolve}
          mutationError={mutationError}
          queryError={query.isError}
        />
      </DialogContent>
    </Dialog>
  );
}