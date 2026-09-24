import { Users, UserSquare2, Eye, Clock } from "lucide-react";
import { useGetPeople, type PersonSummary } from "@/features/people/hooks/use-people";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/date-utils";

export default function PeoplePage() {
  const { data: people, isLoading, isError, error } = useGetPeople();

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load people";
    return <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">Error: {message}</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Identified Persons</h1>
        <p className="text-muted-foreground">
          Database of recognized individuals across the surveillance network.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-2xl bg-white/5" />
          ))
        ) : people?.length === 0 ? (
          <div className="col-span-full flex h-64 flex-col items-center justify-center rounded-2xl border border-white/10 border-dashed bg-white/5 text-muted-foreground">
            <Users className="mb-4 h-8 w-8 opacity-50" />
            <p>No persons identified yet.</p>
          </div>
        ) : (
          people?.map((person: PersonSummary) => (
            <Card key={person.personId} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:border-primary/50 hover:bg-white/10">
              <div className="relative aspect-square w-full overflow-hidden bg-black/50">
                {person.sampleImagePath ? (
                  <img
                    src={`http://localhost:12113${person.sampleImagePath}`}
                    alt={`Person ${person.personId}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <UserSquare2 className="h-16 w-16 text-white/10" />
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <Badge variant="outline" className="border-white/20 bg-black/50 text-white backdrop-blur-md">
                    {person.alertCount} detections
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="mb-4">
                  <h3 className="font-mono text-sm font-medium text-foreground" title={person.personId}>
                    {person.personId.substring(0, 16)}...
                  </h3>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>First seen: {formatRelativeTime(person.firstSeen)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5" />
                    <span>Last seen: {formatRelativeTime(person.lastSeen)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
