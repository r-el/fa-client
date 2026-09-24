import { useState } from "react";
import { Plus, RefreshCw, Video } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCameras } from "@/features/cameras/hooks/use-cameras";
import { CameraCard } from "@/features/cameras/components/CameraCard";
import { CameraEditor } from "@/features/cameras/components/CameraEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cameraError } from "@/features/cameras/api/cameras";

export default function CamerasPage() {
  const { user } = useAuth();
  const cameras = useCameras();
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const canCreate = user?.role === "admin" || user?.role === "operator";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Camera Network</h1>
          <p className="text-muted-foreground">Monitor reported camera status and open live video.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={cameras.isFetching} onClick={() => void cameras.refetch()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${cameras.isFetching ? "animate-spin" : ""}`} />
            {cameras.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          {canCreate && <Button onClick={() => setEditor({})}><Plus className="mr-2 h-4 w-4" />Add camera</Button>}
        </div>
      </div>
      {cameras.isError && <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
        {cameraError(cameras.error)} Use Refresh to retry. {cameras.data?.length ? "Showing the last loaded cameras; statuses may be stale." : ""}
      </div>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cameras.isLoading ? Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-2xl bg-white/5" />
        )) : cameras.data?.length === 0 ? (
          <div className="col-span-full flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-muted-foreground">
            <Video className="h-8 w-8 opacity-50" aria-hidden="true" />
            <p>No cameras are available.</p>
            <p className="text-sm">{canCreate ? "Add a camera to start monitoring." : "Ask an administrator to assign cameras to your account."}</p>
          </div>
        ) : cameras.data?.map((camera) => (
          <CameraCard key={camera.id} camera={camera} role={user?.role} onEdit={() => setEditor({ id: camera.id })} />
        ))}
      </div>
      {editor && canCreate && <CameraEditor cameraId={editor.id} onClose={() => setEditor(null)} />}
    </div>
  );
}
