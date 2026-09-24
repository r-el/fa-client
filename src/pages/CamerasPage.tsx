import { Video, Signal, Settings, Info } from "lucide-react";
import { useGetCameras, type CameraSummary } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function CamerasPage() {
  const { data: cameras, isLoading, isError, error } = useGetCameras();

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load cameras";
    return <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">Error: {message}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Camera Network</h1>
        <p className="text-muted-foreground">
          Manage and monitor all connected surveillance nodes.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-2xl bg-white/5" />
          ))
        ) : cameras?.length === 0 ? (
          <div className="col-span-full flex h-64 flex-col items-center justify-center rounded-2xl border border-white/10 border-dashed bg-white/5 text-muted-foreground">
            <Video className="mb-4 h-8 w-8 opacity-50" />
            <p>No cameras configured in the network.</p>
          </div>
        ) : (
          cameras?.map((camera: CameraSummary) => (
            <Card key={camera.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:border-primary/50 hover:bg-white/10">
              <div className="absolute right-4 top-4">
                <Badge variant={camera.status === "online" ? "default" : "destructive"} className={camera.status === "online" ? "bg-emerald-400/20 text-emerald-400 hover:bg-emerald-400/30" : ""}>
                  <Signal className="mr-1 h-3 w-3" />
                  {camera.status}
                </Badge>
              </div>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                  <Video className="h-6 w-6" />
                </div>
                <CardTitle className="mt-4 text-xl">{camera.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{camera.location}</p>
              </CardHeader>
              <CardContent>
                <div className="mt-2 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Camera ID</span>
                    <span className="font-mono">{camera.specter_camera_id || camera.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Protocol</span>
                    <span>RTSP / H.264</span>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 hover:text-foreground">
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
                  <Button variant="outline" size="icon" className="shrink-0 border-white/10 bg-white/5 hover:bg-white/10 hover:text-foreground">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
