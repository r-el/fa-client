import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoPicker } from "./PhotoPicker";
import { WatchlistError } from "./WatchlistFeedback";
import { parseMetadata, validatePhotos } from "@/features/watchlists/utils";
import type { Target, TargetSpecification, TargetType, TargetUpdate, Watchlist, WatchlistInput, WatchlistKind } from "@/features/watchlists/types";

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const textareaClass = "min-h-24 w-full rounded-md border border-input bg-background p-3 font-mono text-sm";

export function WatchlistForm({ initial, busy, onClose, onSave }: {
  initial?: Watchlist; busy: boolean; onClose: () => void; onSave: (body: WatchlistInput) => Promise<void>;
}) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [targetType, setTargetType] = useState<TargetType>(initial?.target_type ?? "person");
  const [kind, setKind] = useState<WatchlistKind>(initial?.kind ?? "watchlist");
  const [face, setFace] = useState(String(initial?.face_match_threshold_ratio ?? 0.45));
  const [appearance, setAppearance] = useState(String(initial?.appearance_match_threshold_ratio ?? 0.75));
  const [metadata, setMetadata] = useState(JSON.stringify(initial?.metadata ?? {}, null, 2));
  const [error, setError] = useState<unknown>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    try {
      if (!name.trim()) throw new Error("A watchlist name is required.");
      const ratios = [face, appearance].map(Number);
      if (!face.trim() || !appearance.trim() || ratios.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
        throw new Error("Match thresholds must be numbers between 0 and 1.");
      }
      await onSave({ name: name.trim(), target_type: targetType, kind,
        face_match_threshold_ratio: ratios[0], appearance_match_threshold_ratio: ratios[1], metadata: parseMetadata(metadata) });
    } catch (issue) { setError(issue); }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit watchlist" : "Create watchlist"}</DialogTitle>
          <DialogDescription>Configure targets and matching thresholds. Target type cannot be changed after creation.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-2"><label htmlFor={`${id}-name`} className="text-sm">Name</label><Input id={`${id}-name`} required value={name} onChange={(event) => setName(event.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label htmlFor={`${id}-type`} className="text-sm">Target type</label>
                <select id={`${id}-type`} className={selectClass} disabled={Boolean(initial)} value={targetType} onChange={(event) => setTargetType(event.target.value as TargetType)}>
                  <option value="person">Person</option><option value="vehicle">Vehicle</option><option value="object">Object</option>
                </select></div>
              <div className="space-y-2"><label htmlFor={`${id}-kind`} className="text-sm">Kind</label>
                <select id={`${id}-kind`} className={selectClass} value={kind} onChange={(event) => setKind(event.target.value as WatchlistKind)}>
                  <option value="watchlist">Watchlist</option><option value="blacklist">Blacklist</option>
                </select></div>
            </div>
            {targetType !== "person" && <p className="text-sm text-amber-400">Specter identifies individual people only. Vehicles and objects use detection rules, not reference-image matching.</p>}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label htmlFor={`${id}-face`} className="text-sm">Face threshold (0–1)</label><Input id={`${id}-face`} required type="number" min="0" max="1" step="any" value={face} onChange={(event) => setFace(event.target.value)} /></div>
              <div className="space-y-2"><label htmlFor={`${id}-appearance`} className="text-sm">Appearance threshold (0–1)</label><Input id={`${id}-appearance`} required type="number" min="0" max="1" step="any" value={appearance} onChange={(event) => setAppearance(event.target.value)} /></div>
            </div>
            <div className="space-y-2"><label htmlFor={`${id}-metadata`} className="text-sm">Metadata (JSON object)</label><textarea id={`${id}-metadata`} className={textareaClass} value={metadata} onChange={(event) => setMetadata(event.target.value)} /></div>
          </fieldset>
          {error != null && <WatchlistError error={error} />}
          <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save watchlist"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TargetForm({ initial, targetType, busy, onClose, onSave }: {
  initial?: Target; targetType: TargetType; busy: boolean; onClose: () => void;
  onSave: (body: TargetUpdate, specification: TargetSpecification, files: File[]) => Promise<void>;
}) {
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
      if (!label.trim()) throw new Error("A target label is required.");
      const uploadError = validatePhotos(files);
      if (uploadError) throw new Error(uploadError);
      const values = { label: label.trim(), metadata: parseMetadata(metadata) };
      await onSave({ ...values, is_enabled: enabled }, { ...values, image_file_names: files.map((file) => file.name) }, files);
    } catch (issue) { setError(issue); }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit target" : "Create target"}</DialogTitle><DialogDescription>
          {initial ? "Update the target label, metadata or matching availability." : "Photos are enrolled asynchronously. You can also create a target now and add photos later."}
        </DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-2"><label htmlFor={`${id}-label`} className="text-sm">Label</label><Input id={`${id}-label`} required value={label} onChange={(event) => setLabel(event.target.value)} /></div>
            <div className="space-y-2"><label htmlFor={`${id}-metadata`} className="text-sm">Metadata (JSON object)</label><textarea id={`${id}-metadata`} className={textareaClass} value={metadata} onChange={(event) => setMetadata(event.target.value)} /></div>
            {initial && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />Enabled for matching</label>}
            {targetType !== "person" && <p className="text-sm text-amber-400">Individual image matching is supported only for people. This target will not enroll embeddings.</p>}
            {!initial && <PhotoPicker files={files} onChange={setFiles} disabled={busy} />}
          </fieldset>
          {error != null && <WatchlistError error={error} />}
          <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Saving…" : initial ? "Save target" : "Create target"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}