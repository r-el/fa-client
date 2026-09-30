import { useState } from "react";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlertSnapshot } from "@/features/alerts/hooks/use-alerts";
import { alertErrorMessage, type SpecterAlert } from "@/features/alerts/api/alerts";

export function AlertSnapshot({ alert }: { alert: SpecterAlert }) {
  const snapshot = useAlertSnapshot(alert.id, alert.has_snapshot);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!alert.has_snapshot) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 text-muted-foreground">
        <ImageIcon aria-hidden="true" />
        <p>No snapshot was recorded for this alert.</p>
      </div>
    );
  }

  if (snapshot.isError || (snapshot.url && failedUrl === snapshot.url)) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-destructive/30 p-6">
        <p>
          {snapshot.isError
            ? `Snapshot: ${alertErrorMessage(snapshot.error)}`
            : "The snapshot could not be displayed."}
        </p>
        <p className="text-sm text-muted-foreground">
          Evidence may still be arriving, have expired, or be inaccessible. Automatic retries are limited.
        </p>
        <Button
          variant="outline"
          disabled={snapshot.isFetching}
          onClick={() => { void snapshot.refetch(); }}
        >
          Retry snapshot
        </Button>
      </div>
    );
  }

  if (!snapshot.url) {
    return (
      <p role="status" className="flex items-center gap-2 p-6">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading protected snapshot…
      </p>
    );
  }

  const altText = `Evidence for ${
    alert.kind === "identity_match"
      ? alert.target_label || alert.target_id || "identity match"
      : alert.rule_kind?.replaceAll("_", " ") || "rule"
  }`;

  return (
    <img
      src={snapshot.url}
      onError={() => setFailedUrl(snapshot.url)}
      alt={altText}
      className="max-h-[50vh] w-full rounded-xl border border-white/10 bg-black object-contain"
    />
  );
}
