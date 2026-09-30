import { Activity, ShieldAlert, Video } from "lucide-react";
import { Suspense, lazy } from "react";
import { KpiCard } from "@/components/kpi-card";
import { AlertsTable } from "@/features/alerts/components/AlertsTable";
import { useGetStats } from "@/features/dashboard/hooks/use-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const AlertsChart = lazy(() => import("@/components/alerts-chart").then(mod => ({ default: mod.AlertsChart })));

export default function OverviewPage() {
  const { data: stats, isLoading, isError, refetch, isFetching } = useGetStats();

  const isSystemOnline = stats?.systemStatus === "online" || stats?.systemStatus === "operational";
  const isSystemOffline = stats?.systemStatus === "offline";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* KPI Cards Section */}
      {isError ? (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <p className="text-foreground">Failed to load system statistics. Live telemetry is unavailable.</p>
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => { void refetch(); }}>
            Retry
          </Button>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl bg-white/5" />
            ))
          ) : stats ? (
            <>
              <KpiCard
                title="Active Cameras"
                value={stats.activeCameras}
                icon={Video}
                description={
                  stats.totalCameras !== undefined
                    ? `${stats.activeCameras} of ${stats.totalCameras} online`
                    : undefined
                }
              />
              <KpiCard
                title="Today's Events"
                value={stats.todaysEvents}
                icon={Activity}
                description="Events detected today"
              />
              <KpiCard
                title="High Risk Alerts"
                value={stats.highRiskAlerts}
                icon={ShieldAlert}
                description={
                  stats.highRiskAlerts > 0
                    ? "Requires attention"
                    : "No pending alerts"
                }
              />
              <KpiCard
                title="System Status"
                value={isSystemOnline ? 100 : isSystemOffline ? 0 : 50}
                icon={Activity}
                description={
                  isSystemOnline
                    ? "All systems nominal"
                    : isSystemOffline
                    ? "System offline"
                    : `Status: ${stats.systemStatus}`
                }
                trend={isSystemOnline ? "Operational" : isSystemOffline ? "Offline" : stats.systemStatus}
                trendDirection={isSystemOnline ? "up" : isSystemOffline ? "down" : undefined}
              />
            </>
          ) : null}
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Alerts Chart Section */}
        <section className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Alert Volume</h2>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground">Last 7 days</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <Suspense fallback={<Skeleton className="h-[350px] w-full rounded-2xl bg-white/5" />}>
              <AlertsChart />
            </Suspense>
          </div>
        </section>

        {/* Recent Alerts Section */}
        <section className="flex flex-col gap-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Recent Matches</h2>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
            <AlertsTable limit={5} />
          </div>
        </section>
      </div>
    </div>
  );
}
