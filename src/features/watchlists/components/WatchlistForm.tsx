import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WatchlistError } from "./WatchlistFeedback";
import { parseMetadata } from "@/features/watchlists/utils";
import type { TargetType, Watchlist, WatchlistInput, WatchlistKind } from "@/features/watchlists/types";

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export interface WatchlistFormProps {
  initial?: Watchlist;
  busy: boolean;
  onClose: () => void;
  onSave: (body: WatchlistInput) => Promise<void>;
}

export function WatchlistForm({ initial, busy, onClose, onSave }: WatchlistFormProps) {
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
      await onSave({
        name: name.trim(),
        target_type: targetType,
        kind,
        face_match_threshold_ratio: ratios[0],
        appearance_match_threshold_ratio: ratios[1],
        metadata: parseMetadata(metadata),
      });
    } catch (issue) {
      setError(issue);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit watchlist" : "Create watchlist"}</DialogTitle>
          <DialogDescription>Configure targets and matching thresholds. Target type cannot be changed after creation.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor={`${id}-name`} className="text-sm">Name</label>
              <Input id={`${id}-name`} required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor={`${id}-type`} className="text-sm">Target type</label>
                <select
                  id={`${id}-type`}
                  className={selectClass}
                  disabled={Boolean(initial)}
                  value={targetType}
                  onChange={(event) => setTargetType(event.target.value as TargetType)}
                >
                  <option value="person">Person</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="object">Object</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor={`${id}-kind`} className="text-sm">Kind</label>
                <select
                  id={`${id}-kind`}
                  className={selectClass}
                  value={kind}
                  onChange={(event) => setKind(event.target.value as WatchlistKind)}
                >
                  <option value="watchlist">Watchlist</option>
                  <option value="blacklist">Blacklist</option>
                </select>
              </div>
            </div>
            {targetType !== "person" && (
              <p className="text-sm text-amber-400">
                Specter identifies individual people only. Vehicles and objects use detection rules, not reference-image matching.
              </p>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">Match Sensitivity Presets:</span>
                <div className="flex gap-1.5">
                  {[
                    { label: "Strict", faceVal: "0.50", appVal: "0.80" },
                    { label: "Balanced", faceVal: "0.45", appVal: "0.75" },
                    { label: "High Recall", faceVal: "0.35", appVal: "0.65" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => { setFace(preset.faceVal); setAppearance(preset.appVal); }}
                      className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`${id}-face`} className="text-sm">Face threshold (0–1)</label>
                    <span className="text-xs text-primary font-mono">
                      {!isNaN(Number(face)) && face.trim() !== "" ? `${Math.round(Number(face) * 100)}%` : ""}
                    </span>
                  </div>
                  <Input
                    id={`${id}-face`}
                    required
                    type="number"
                    min="0"
                    max="1"
                    step="any"
                    value={face}
                    onChange={(event) => setFace(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`${id}-appearance`} className="text-sm">Appearance threshold (0–1)</label>
                    <span className="text-xs text-primary font-mono">
                      {!isNaN(Number(appearance)) && appearance.trim() !== "" ? `${Math.round(Number(appearance) * 100)}%` : ""}
                    </span>
                  </div>
                  <Input
                    id={`${id}-appearance`}
                    required
                    type="number"
                    min="0"
                    max="1"
                    step="any"
                    value={appearance}
                    onChange={(event) => setAppearance(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-metadata`} className="text-sm">Metadata (JSON object)</label>
              <Textarea
                id={`${id}-metadata`}
                className="min-h-24 font-mono text-sm"
                value={metadata}
                onChange={(event) => setMetadata(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Optional JSON configuration.</p>
            </div>
          </fieldset>
          {error != null && <WatchlistError error={error} />}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save watchlist"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
