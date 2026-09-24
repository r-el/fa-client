import { useState, type FormEvent } from "react";
import { useCameraDetails, useCameraMutations } from "@/features/cameras/hooks/use-cameras";
import { useWatchlists } from "@/features/watchlists/hooks/use-watchlists";
import { cameraError, type CameraDetails, type CameraInput, type CameraUpdate } from "@/features/cameras/api/cameras";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function CameraEditor({ cameraId, onClose }: { cameraId?: string; onClose: () => void }) {
  const details = useCameraDetails(cameraId);
  const [isSaving, setIsSaving] = useState(false);
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSaving) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{cameraId ? "Edit camera" : "Add camera"}</DialogTitle>
          <DialogDescription>Configure the source and watchlists used by this camera.</DialogDescription>
        </DialogHeader>
        {cameraId && details.isPending ? <p role="status">Loading camera configuration…</p>
          : cameraId && details.isError ? (
            <div role="alert" className="space-y-3">
              <p>{cameraError(details.error)}</p>
              <Button variant="outline" onClick={() => void details.refetch()}>Retry</Button>
            </div>
          ) : <CameraForm camera={details.data} onClose={onClose} onSaving={setIsSaving} />}
      </DialogContent>
    </Dialog>
  );
}

function CameraForm({ camera, onClose, onSaving }: {
  camera?: CameraDetails;
  onClose: () => void;
  onSaving: (saving: boolean) => void;
}) {
  const [name, setName] = useState(camera?.name ?? "");
  const [sourceUrl, setSourceUrl] = useState(camera?.source_url ?? "");
  const [location, setLocation] = useState(camera?.location ?? "");
  const [watchlistIds, setWatchlistIds] = useState(camera?.watchlist_ids ?? []);
  const [classes, setClasses] = useState(camera?.detection_classes.join(", ") ?? "");
  const [credentialMode, setCredentialMode] = useState<"keep" | "replace" | "clear">("keep");
  const [username, setUsername] = useState(camera?.username ?? "");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState("");
  const watchlists = useWatchlists();
  const { create, update } = useCameraMutations();
  const isPending = create.isPending || update.isPending;
  const mutationError = create.error || update.error;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (isPending) return;
    setValidationError("");
    const detectionClasses = [...new Set(classes.split(",").map((value) => value.trim()).filter(Boolean))];
    if (!name.trim()) return setValidationError("Camera name is required.");
    if (watchlistIds.length > 50) return setValidationError("Select at most 50 watchlists.");
    if (detectionClasses.length > 80 || detectionClasses.some((value) => value.length > 50)) {
      return setValidationError("Use at most 80 detection classes, each no longer than 50 characters.");
    }
    try {
      const parsed = new URL(sourceUrl.trim());
      if (!/^(rtsps?|https?):$/.test(parsed.protocol) || !parsed.hostname || /\s/.test(sourceUrl.trim())) {
        throw new Error("Invalid source");
      }
      // Keep passwords out of displayed URLs and require deliberate credential replacement.
      if (parsed.username || parsed.password) {
        return setValidationError("Remove credentials from the URL and use the username/password fields below.");
      }
    } catch {
      return setValidationError("Enter a valid RTSP, RTSPS, HTTP or HTTPS source URL.");
    }
    const body: CameraInput = {
      name: name.trim(), source_url: sourceUrl.trim(), location: location.trim(),
      watchlist_ids: watchlistIds, detection_classes: detectionClasses,
    };
    if (credentialMode === "replace") {
      if (!username || !password) return setValidationError("Both username and password are required.");
      body.credentials = { username, password };
    }
    onSaving(true);
    try {
      if (camera) {
        const changes: CameraUpdate = { ...body };
        if (credentialMode === "clear") changes.credentials = null;
        await update.mutateAsync({ id: camera.id, body: changes });
      } else {
        await create.mutateAsync(body);
      }
      onClose();
    } catch {
      // Keep the form and entered values open; the mutation exposes the server error.
    } finally {
      onSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <fieldset disabled={isPending} className="space-y-4">
        <label className="block space-y-1 text-sm">Name
          <Input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">Source URL
          <Input required maxLength={500} placeholder="rtsp://camera-host:554/stream" autoComplete="off" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">Location
          <Input maxLength={200} value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">Credentials
          <select className="w-full rounded-md border bg-background p-2" value={credentialMode}
            onChange={(event) => setCredentialMode(event.target.value as typeof credentialMode)}>
            <option value="keep">{camera ? "Keep existing credentials" : "No credentials"}</option>
            <option value="replace">{camera ? "Replace credentials" : "Set credentials"}</option>
            {camera && <option value="clear">Remove stored credentials</option>}
          </select>
        </label>
        {camera && <p className="text-xs text-muted-foreground">{camera.has_password ? "A password is stored; it is never returned by the server." : "No password is stored."}</p>}
        {credentialMode === "replace" && <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">Username
            <Input required maxLength={100} autoComplete="off" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">Password
            <Input required type="password" maxLength={200} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
        </div>}
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Watchlists ({watchlistIds.length}/50)</legend>
          <p className="text-xs text-muted-foreground">Select the watchlists this camera should identify against. None means no watchlist matching.</p>
          {watchlists.isPending && <p role="status" className="text-sm">Loading watchlists…</p>}
          {watchlists.isError && <div role="alert" className="text-sm text-rose-400">
            <p>Could not load watchlists: {cameraError(watchlists.error)} Existing selections are preserved.</p>
            <Button type="button" variant="outline" onClick={() => void watchlists.refetch()}>Retry watchlists</Button>
          </div>}
          {watchlists.data?.length === 0 && <p className="text-sm text-muted-foreground">No watchlists available. Create one on the Watchlists page first.</p>}
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {watchlists.data?.map((watchlist) => <label key={watchlist.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={watchlistIds.includes(watchlist.id)}
                disabled={!watchlistIds.includes(watchlist.id) && watchlistIds.length >= 50}
                onChange={(event) => setWatchlistIds((current) => event.target.checked
                  ? [...current, watchlist.id] : current.filter((id) => id !== watchlist.id))} />
              {watchlist.name} <span className="text-xs text-muted-foreground">({watchlist.target_type})</span>
            </label>)}
            {watchlistIds.filter((id) => !watchlists.data?.some((item) => item.id === id)).map((id) => (
              <label key={id} className="flex items-center gap-2 break-all text-sm">
                <input type="checkbox" checked onChange={() => setWatchlistIds((current) => current.filter((value) => value !== id))} />
                Selected watchlist: {id} (not in available list)
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block space-y-1 text-sm">Detection classes (comma-separated)
          <Input placeholder="person, car" value={classes} onChange={(event) => setClasses(event.target.value)} />
          <span className="text-xs text-muted-foreground">COCO class names. Leave empty to detect all classes.</span>
        </label>
      </fieldset>
      {Boolean(validationError || mutationError) && <p role="alert" className="text-sm text-rose-400">{validationError || cameraError(mutationError)}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={isPending} onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : camera ? "Save changes" : "Create camera"}</Button>
      </div>
    </form>
  );
}