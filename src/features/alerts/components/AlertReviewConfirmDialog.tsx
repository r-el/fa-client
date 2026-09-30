import { useId } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { alertErrorMessage, type AlertResolution } from "@/features/alerts/api/alerts";

interface AlertReviewConfirmDialogProps {
  confirmation: "acknowledge" | AlertResolution | null;
  note: string;
  onNoteChange: (note: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  canResolve: boolean;
  mutationError: unknown;
  queryError: boolean;
}

const label = (value: string | null | undefined) => value ? value.replaceAll("_", " ") : "—";

export function AlertReviewConfirmDialog({
  confirmation,
  note,
  onNoteChange,
  onClose,
  onConfirm,
  pending,
  canResolve,
  mutationError,
  queryError,
}: AlertReviewConfirmDialogProps) {
  const noteId = useId();
  const noteLength = Array.from(note).length;

  if (!confirmation) return null;

  const isAcknowledge = confirmation === "acknowledge";
  const title = isAcknowledge ? "Acknowledge this alert?" : `Resolve as ${label(confirmation)}?`;
  const description = isAcknowledge
    ? "Mark this alert as seen. This does not change its disposition."
    : "This updates the alert's review disposition for everyone. Any existing review note will be replaced.";

  const isConfirmDisabled =
    pending ||
    queryError ||
    (!isAcknowledge && (!canResolve || noteLength > 1000));

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!isAcknowledge && (
          <div className="space-y-2">
            <label htmlFor={noteId} className="text-sm font-medium">
              Review note (optional)
            </label>
            <Textarea
              id={noteId}
              value={note}
              maxLength={1000}
              disabled={pending}
              onChange={(event) => onNoteChange(event.target.value)}
              aria-describedby={`${noteId}-length`}
              className="min-h-28"
            />
            <p id={`${noteId}-length`} className="text-xs text-muted-foreground">
              {noteLength}/1000 characters
            </p>
          </div>
        )}

        {Boolean(mutationError) && (
          <p role="alert" className="text-sm text-destructive">
            {alertErrorMessage(mutationError)} No automatic write retry was made.
          </p>
        )}
        {queryError && (
          <p role="alert" className="text-sm text-destructive">
            Refresh the alert details before confirming.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isConfirmDisabled} onClick={onConfirm}>
            {pending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Confirm {isAcknowledge ? "acknowledgment" : "resolution"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
