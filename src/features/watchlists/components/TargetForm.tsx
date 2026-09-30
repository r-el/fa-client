import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoPicker } from "./PhotoPicker";
import { WatchlistError } from "./WatchlistFeedback";
import { MetadataField } from "./MetadataField";
import { validateTargetForm } from "@/features/watchlists/validation";
import type { Target, TargetSpecification, TargetType, TargetUpdate } from "@/features/watchlists/types";

export interface TargetFormProps {
  initial?: Target;
  targetType: TargetType;
  busy: boolean;
  onClose: () => void;
  onSave: (body: TargetUpdate, specification: TargetSpecification, files: File[]) => Promise<void>;
}

export function TargetForm({ initial, targetType, busy, onClose, onSave }: TargetFormProps) {
  const id = useId();
  const [label, setLabel] = useState(initial?.label ?? "");
  const [metadata, setMetadata] = useState(JSON.stringify(initial?.metadata ?? {}, null, 2));
  const [enabled, setEnabled] = useState(initial?.is_enabled ?? true);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<unknown>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    try {
      const { update, specification } = validateTargetForm({
        label,
        metadata,
        enabled,
        files,
      });
      await onSave(update, specification, files);
    } catch (issue) {
      setError(issue);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit target" : "Create target"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Update the target label, metadata or matching availability."
              : "Photos are enrolled asynchronously. You can also create a target now and add photos later."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor={`${id}-label`} className="text-sm font-medium">Label</label>
              <Input id={`${id}-label`} required value={label} onChange={(event) => setLabel(event.target.value)} />
            </div>
            <MetadataField
              id={`${id}-metadata`}
              description="Optional JSON data."
              disabled={busy}
              value={metadata}
              onChange={setMetadata}
            />
            {initial && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
                Enabled for matching
              </label>
            )}
            {targetType !== "person" && (
              <p className="text-sm text-amber-400">
                Individual image matching is supported only for people. This target will not enroll embeddings.
              </p>
            )}
            {!initial && <PhotoPicker files={files} onChange={setFiles} disabled={busy} />}
          </fieldset>
          {error != null && <WatchlistError error={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : initial ? "Save target" : "Create target"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
