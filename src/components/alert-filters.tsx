import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AlertDisposition, AlertFilters, AlertKind } from "@/services/alerts";

const emptyDraft = { cameras: "", kind: "", disposition: "", since: "", until: "" };
const selectClass = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AlertFiltersForm({ onApply }: { onApply: (filters: AlertFilters) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(emptyDraft);
  const [error, setError] = useState("");
  const [isApplied, setIsApplied] = useState(false);
  const update = (key: keyof typeof emptyDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setIsApplied(false);
    setError("");
  };

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const since = draft.since ? new Date(draft.since) : undefined;
    const until = draft.until ? new Date(draft.until) : undefined;
    if ((since && !Number.isFinite(since.getTime())) || (until && !Number.isFinite(until.getTime()))) {
      setError("Enter valid dates.");
      return;
    }
    if (since && until && since > until) {
      setError("The start date must be before or equal to the end date.");
      return;
    }
    const cameras = [...new Set(draft.cameras.split(",").map((value) => value.trim()).filter(Boolean))];
    if (cameras.length > 500) {
      setError("Select no more than 500 camera IDs.");
      return;
    }
    setError("");
    onApply({
      camera_id: cameras.length ? cameras : undefined,
      kind: (draft.kind || undefined) as AlertKind | undefined,
      disposition: (draft.disposition || undefined) as AlertDisposition | undefined,
      created_since: since?.toISOString(),
      created_until: until?.toISOString(),
    });
    setIsApplied(true);
  }

  return (
    <form onSubmit={apply} className="mb-6 space-y-4 rounded-xl border border-white/10 bg-white/5 p-4" aria-label="Filter alerts">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor={`${id}-cameras`} className="text-sm font-medium">Camera IDs</label>
          <Input id={`${id}-cameras`} value={draft.cameras} onChange={(event) => update("cameras", event.target.value)} placeholder="All cameras (or comma-separated IDs)" aria-describedby={`${id}-help`} />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${id}-kind`} className="text-sm font-medium">Alert kind</label>
          <select id={`${id}-kind`} className={selectClass} value={draft.kind} onChange={(event) => update("kind", event.target.value)}>
            <option value="">All kinds</option>
            <option value="identity_match">Identity match</option>
            <option value="rule">Rule</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor={`${id}-disposition`} className="text-sm font-medium">Disposition</label>
          <select id={`${id}-disposition`} className={selectClass} value={draft.disposition} onChange={(event) => update("disposition", event.target.value)}>
            <option value="">All dispositions</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="true_positive">True positive</option>
            <option value="false_positive">False positive</option>
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor={`${id}-since`} className="text-sm font-medium">Created from (local time)</label>
          <Input id={`${id}-since`} type="datetime-local" step="1" value={draft.since} onChange={(event) => update("since", event.target.value)} />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${id}-until`} className="text-sm font-medium">Created until (local time)</label>
          <Input id={`${id}-until`} type="datetime-local" step="1" value={draft.until} onChange={(event) => update("until", event.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit">Apply filters</Button>
          <Button type="button" variant="outline" onClick={() => {
            setDraft(emptyDraft);
            setError("");
            setIsApplied(false);
            onApply({});
          }}>Reset</Button>
        </div>
      </div>
      <p id={`${id}-help`} className="text-xs text-muted-foreground">Filters are applied on the server to the entire alert history. Camera IDs are available in alert details.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <p role="status" className="text-xs text-muted-foreground">{isApplied ? "Filters applied." : "Apply filters to update results."}</p>
    </form>
  );
}