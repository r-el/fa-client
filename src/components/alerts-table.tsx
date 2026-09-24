import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { Loader2, AlertCircle, Info, Image as ImageIcon, Search } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";

import { useGetAlerts, type Alert } from "@/hooks/use-api";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDateTime } from "@/lib/date-utils";

interface AlertsTableProps {
  limit?: number;
}

export function AlertsTable({ limit }: AlertsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  
  const { ref, inView } = useInView();

  const {
    data,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useGetAlerts({
    page_size: limit || 20,
    message_search: debouncedSearch || undefined,
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const alerts: Alert[] = useMemo(() => {
    if (!data) return [];
    return data.pages.flat();
  }, [data]);

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load alerts";
    return <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">Error: {message}</div>;
  }

  const tableContent = (
    <div className="w-full">
      {!limit && (
        <div className="mb-6 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="border-white/10 bg-white/5 pl-9 placeholder:text-muted-foreground focus-visible:ring-primary/20"
            />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
        <Table>
          <TableHeader className="border-b border-white/10 bg-white/5">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="w-[120px] text-xs uppercase tracking-wider text-muted-foreground">Type</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Person</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Time</TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wider text-muted-foreground md:table-cell">Camera</TableHead>
              <TableHead className="hidden text-xs uppercase tracking-wider text-muted-foreground lg:table-cell">Confidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: limit || 10 }).map((_, index) => (
                <TableRow key={index} className="border-white/5">
                  <TableCell><Skeleton className="h-6 w-16 rounded-full bg-white/10" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32 bg-white/10" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24 bg-white/10" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24 bg-white/10" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-16 bg-white/10" /></TableCell>
                </TableRow>
              ))
            ) : alerts.length === 0 ? (
              <TableRow className="border-none">
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No alerts found.
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((alert) => (
                <TableRow
                  key={alert._id}
                  onClick={() => setSelectedAlert(alert)}
                  className="cursor-pointer border-white/5 transition-colors hover:bg-white/10"
                >
                  <TableCell>
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3" />
                        <span>Match</span>
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{alert.person_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(alert.timestamp)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {alert.camera_id ? (
                      <Link
                        to={`/cameras?camera_id=${alert.camera_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="transition-colors hover:text-primary hover:underline"
                      >
                        {alert.camera_id}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {alert.detection_metadata?.confidence ? (
                      <span className="rounded-full bg-white/5 px-2 py-1 text-xs font-medium">
                        {(alert.detection_metadata.confidence * 100).toFixed(1)}%
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div ref={ref} className="mt-4 flex justify-center py-4">
        {isFetchingNextPage && (
          <Icon icon={Loader2} className="h-5 w-5 animate-spin text-muted-foreground" />
        )}
        {!isFetchingNextPage && !hasNextPage && alerts.length > 0 && (
          <p className="text-xs text-muted-foreground">End of results.</p>
        )}
      </div>

      <Drawer open={Boolean(selectedAlert)} onOpenChange={(open: boolean) => !open && setSelectedAlert(null)}>
        <DrawerContent className="border-white/10 bg-slate-950/95 backdrop-blur-xl">
          <DrawerHeader className="border-b border-white/10 pb-6">
            <DrawerTitle className="text-2xl text-foreground">Match Alert: {selectedAlert?.person_name}</DrawerTitle>
            <DrawerDescription className="text-muted-foreground">
              Detected at {selectedAlert ? formatDateTime(selectedAlert.timestamp) : "-"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 py-6 md:px-8">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="mb-6 h-12 w-full justify-start rounded-xl bg-white/5 p-1">
                <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <Info className="mr-2 h-4 w-4" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="image" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Image Evidence
                </TabsTrigger>
                <TabsTrigger value="json" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  Raw Data
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 text-sm">
                <div className="grid grid-cols-2 gap-y-4 md:grid-cols-4">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground uppercase tracking-wider">Time</p>
                    <p className="font-medium text-foreground">{selectedAlert ? formatDateTime(selectedAlert.timestamp) : "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground uppercase tracking-wider">Camera ID</p>
                    <p className="font-medium text-foreground">{selectedAlert?.camera_id ?? "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground uppercase tracking-wider">Confidence</p>
                    <p className="font-medium text-foreground">
                      {selectedAlert?.detection_metadata?.confidence 
                        ? `${(selectedAlert.detection_metadata.confidence * 100).toFixed(2)}%` 
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground uppercase tracking-wider">Bounding Box</p>
                    <p className="font-mono text-xs text-foreground">
                      {selectedAlert?.detection_metadata?.bbox 
                        ? `[${selectedAlert.detection_metadata.bbox.map((n: number) => Math.round(n)).join(", ")}]` 
                        : "-"}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="image">
                {selectedAlert?.image_path ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/50">
                    <img 
                      src={`http://localhost:12113${selectedAlert.image_path}`} 
                      alt={`Detection of ${selectedAlert.person_name}`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-white/10 border-dashed bg-white/5 text-muted-foreground">
                    <ImageIcon className="mb-2 h-8 w-8 opacity-50" />
                    <p>No image evidence available</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="json">
                <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/50">
                  <pre className="h-[300px] overflow-auto p-4 text-xs font-mono text-cyan-300">
                    {selectedAlert ? JSON.stringify(selectedAlert, null, 2) : "{}"}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );

  return limit ? tableContent : <div className="mt-4">{tableContent}</div>;
}
