import { Button } from "@/components/ui/button";
import { useWatchlists } from "@/features/watchlists/hooks/use-watchlists";
import { cameraError } from "@/features/cameras/api/cameras";

interface CameraWatchlistSelectorProps {
  watchlistIds: string[];
  onChange: (ids: string[] | ((current: string[]) => string[])) => void;
  disabled?: boolean;
}

export function CameraWatchlistSelector({
  watchlistIds,
  onChange,
  disabled = false,
}: CameraWatchlistSelectorProps) {
  const watchlists = useWatchlists();

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium">Watchlists ({watchlistIds.length}/50)</legend>
      <p className="text-xs text-muted-foreground">
        Select the watchlists this camera should identify against. None means no watchlist matching.
      </p>

      {watchlists.isPending && <p role="status" className="text-sm">Loading watchlists…</p>}

      {watchlists.isError && (
        <div role="alert" className="text-sm text-rose-400">
          <p>Could not load watchlists: {cameraError(watchlists.error)} Existing selections are preserved.</p>
          <Button type="button" variant="outline" onClick={() => void watchlists.refetch()}>
            Retry watchlists
          </Button>
        </div>
      )}

      {watchlists.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No watchlists available. Create one on the Watchlists page first.
        </p>
      )}

      <div className="max-h-40 space-y-2 overflow-y-auto">
        {watchlists.data?.map((watchlist) => (
          <label key={watchlist.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={watchlistIds.includes(watchlist.id)}
              disabled={!watchlistIds.includes(watchlist.id) && watchlistIds.length >= 50}
              onChange={(event) =>
                onChange((current) =>
                  event.target.checked
                    ? [...current, watchlist.id]
                    : current.filter((id) => id !== watchlist.id)
                )
              }
            />
            {watchlist.name} <span className="text-xs text-muted-foreground">({watchlist.target_type})</span>
          </label>
        ))}

        {watchlistIds
          .filter((id) => !watchlists.data?.some((item) => item.id === id))
          .map((id) => (
            <label key={id} className="flex items-center gap-2 break-all text-sm">
              <input
                type="checkbox"
                checked
                onChange={() => onChange((current) => current.filter((value) => value !== id))}
              />
              Selected watchlist: {id} (not in available list)
            </label>
          ))}
      </div>
    </fieldset>
  );
}
