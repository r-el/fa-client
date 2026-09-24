import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hasPendingEnrollment, watchlistError } from "./utils";
import type { Target } from "./types";

export function WatchlistError({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
      <p className="break-words">{watchlistError(error)}</p>
      {retry && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={retry}>Try again</Button>}
    </div>
  );
}

export function EnrollmentBadge({ target }: { target: Target }) {
  const pending = hasPendingEnrollment(target);
  const colors = {
    queued: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    partial: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    failed: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  };
  const label = target.enrollment_status === "queued"
    ? pending ? "Pending" : "Not enrolled"
    : target.enrollment_status;
  return <Badge variant="outline" className={`capitalize ${colors[target.enrollment_status]}`}>
    {label}{pending && target.enrollment_status === "partial" ? " · processing" : ""}
  </Badge>;
}

export function ConfirmWatchlistDelete({ title, description, busy, error, onCancel, onConfirm }: {
  title: string; description: string; busy: boolean; error: unknown;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        {error != null && <WatchlistError error={error} />}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>{busy ? "Deleting…" : "Delete permanently"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}