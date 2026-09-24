import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnrollmentBatch, useWatchlistMutations } from "@/features/watchlists/hooks/use-watchlists";
import { watchlistsService } from "@/features/watchlists/api/watchlists";
import { PhotoPicker } from "./PhotoPicker";
import { ConfirmWatchlistDelete, EnrollmentBadge, WatchlistError } from "./WatchlistFeedback";
import { hasPendingEnrollment } from "@/features/watchlists/utils";
import type { ReferenceImage, Target } from "@/features/watchlists/types";

function ReferencePhoto({ target, image, busy, onDelete }: {
  target: Target; image: ReferenceImage; busy: boolean; onDelete: () => void;
}) {
  const photo = useQuery({
    queryKey: ["targets", target.watchlist_id, target.id, "images", image.id],
    queryFn: ({ signal }) => watchlistsService.photo(target.watchlist_id, target.id, image.id, signal),
    staleTime: Infinity,
    gcTime: 0,
  });
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!photo.data) return;
    const objectUrl = URL.createObjectURL(photo.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photo.data]);
  const extension = photo.data?.type === "image/png" ? "png" : photo.data?.type === "image/webp" ? "webp" : "jpg";
  return (
    <Card className="overflow-hidden rounded-xl border-white/10 bg-white/5">
      <CardContent className="space-y-3 p-3">
        {photo.isPending && <Skeleton className="h-40 w-full" />}
        {photo.isError && <WatchlistError error={photo.error} retry={() => { void photo.refetch(); }} />}
        {url && <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Preview reference photo ${image.id}`}>
          <img src={url} alt={`Reference photo for ${target.label}`} className="h-40 w-full rounded-lg object-contain bg-black/30" />
        </a>}
        <div className="space-y-1 text-xs" aria-live="polite">
          {image.embeddings.length === 0 && <p className="text-muted-foreground">No enrollment modalities for this target type.</p>}
          {image.embeddings.map((embedding) => <p key={embedding.modality} className="break-words">
            <span className="capitalize">{embedding.modality}: {embedding.status}</span>
            {embedding.rejection_reason && <span className="text-rose-400"> — {embedding.rejection_reason.replaceAll("_", " ")}</span>}
            {embedding.quality_score_ratio !== null && <span className="text-muted-foreground"> · quality {Math.round(embedding.quality_score_ratio * 100)}%</span>}
          </p>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {url && <Button asChild variant="outline" size="sm"><a href={url} download={`${image.id}.${extension}`}><Download />Download</a></Button>}
          <Button variant="ghost" size="sm" className="text-rose-400" disabled={busy} onClick={onDelete} aria-label={`Delete reference photo ${image.id}`}><Trash2 />Remove</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function EnrollmentBatchProgress({ batchId }: { batchId: string }) {
  const batch = useEnrollmentBatch(batchId);
  return <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4" aria-live="polite">
    <p className="text-sm font-medium">Enrollment batch</p>
    <p className="break-all font-mono text-xs text-muted-foreground">{batchId}</p>
    {batch.isPending && <p role="status" className="text-sm text-muted-foreground">Loading enrollment…</p>}
    {batch.isError && <WatchlistError error={batch.error} retry={() => { void batch.refetch(); }} />}
    {batch.data && <>
      <p className="text-xs text-muted-foreground">{batch.data.some(hasPendingEnrollment)
        ? "Processing reference photos. Status updates automatically."
        : "No pending embeddings. Partial results may include rejected photos; targets without embeddings remain unenrolled."}</p>
      <div className="flex flex-wrap gap-3">{batch.data.map((target) => <div key={target.id} className="flex min-w-0 items-center gap-2 text-sm">
        <span className="max-w-48 truncate">{target.label}</span><EnrollmentBadge target={target} />
      </div>)}</div>
    </>}
  </div>;
}

export function TargetDetails({ target, onClose }: { target: Target; onClose: () => void }) {
  const { addPhotos, deletePhoto } = useWatchlistMutations();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [deletingImage, setDeletingImage] = useState<string>();
  const busy = addPhotos.isPending || deletePhoto.isPending;
  const upload = async () => {
    if (busy || !files.length) return;
    setError(null);
    try {
      await addPhotos.mutateAsync({ watchlistId: target.watchlist_id, targetId: target.id, files });
      setFiles([]);
    } catch (issue) { setError(issue); }
  };
  const remove = async () => {
    if (!deletingImage || busy) return;
    try {
      await deletePhoto.mutateAsync({ watchlistId: target.watchlist_id, targetId: target.id, imageId: deletingImage });
      setDeletingImage(undefined);
    } catch { /* The confirmation displays the mutation error and stays open. */ }
  };
  return <>
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle className="break-words">{target.label}</DialogTitle><DialogDescription>Reference photos and asynchronous enrollment results. Select a preview to view it full size.</DialogDescription></DialogHeader>
        <div className="flex flex-wrap items-center gap-3"><EnrollmentBadge target={target} /><span className="text-sm text-muted-foreground">{target.is_enabled ? "Enabled" : "Disabled"} · {target.reference_images.length} photos</span></div>
        {target.enrollment_batch_id && <EnrollmentBatchProgress batchId={target.enrollment_batch_id} />}
        {!hasPendingEnrollment(target) && target.enrollment_status === "queued" && <p className="text-sm text-amber-400">No embeddings are pending. Add reference photos to a person target to begin enrollment.</p>}
        {target.reference_images.length === 0
          ? <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">No reference photos yet.</p>
          : <div className="grid gap-4 sm:grid-cols-2">{target.reference_images.map((image) => <ReferencePhoto key={image.id} image={image} target={target} busy={busy}
            onDelete={() => { deletePhoto.reset(); setDeletingImage(image.id); }} />)}</div>}
        <section className="space-y-3 border-t border-white/10 pt-4" aria-label="Add reference photos">
          <h3 className="font-medium">Add reference photos</h3>
          <PhotoPicker files={files} onChange={setFiles} disabled={busy} />
          {error != null && <WatchlistError error={error} />}
          <Button disabled={busy || files.length === 0} onClick={() => { void upload(); }}>{addPhotos.isPending ? "Uploading…" : "Upload photos"}</Button>
        </section>
      </DialogContent>
    </Dialog>
    {deletingImage && <ConfirmWatchlistDelete title="Remove reference photo?" description="The photo and its embeddings will be permanently removed. This may change the target’s enrollment status."
      busy={deletePhoto.isPending} error={deletePhoto.error} onCancel={() => setDeletingImage(undefined)} onConfirm={() => { void remove(); }} />}
  </>;
}