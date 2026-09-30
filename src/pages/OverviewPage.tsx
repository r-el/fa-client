import { Activity, ShieldAlert, Video } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { AlertsChart } from "@/components/alerts-chart";
import { AlertsTable } from "@/features/alerts/components/AlertsTable";
import { useGetStats } from "@/features/dashboard/hooks/use-dashboard";
import { Skeleton } from "@/components/ui/skeleton";

export default function OverviewPage() {
  const { data: stats, isLoading } = useGetStats();

  const isSystemOnline = stats?.systemStatus === "online" || stats?.systemStatus === "operational";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* KPI Cards Section */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl bg-white/5" />
          ))
        ) : (
          <>
            <KpiCard
              title="Active Cameras"
              value={stats?.activeCameras ?? 0}
              icon={Video}
              description={
                stats?.totalCameras !== undefined
                  ? `${stats.activeCameras} of ${stats.totalCameras} online`
                  : undefined
              }
            />
            <KpiCard
              title="Today's Events"
              value={stats?.todaysEvents ?? 0}
              icon={Activity}
              description="Events detected today"
            />
            <KpiCard
              title="High Risk Alerts"
              value={stats?.highRiskAlerts ?? 0}
              icon={ShieldAlert}
              description={
                stats?.highRiskAlerts && stats.highRiskAlerts > 0
                  ? "Requires attention"
                  : "No pending alerts"
              }
            />
            <KpiCard
              title="System Status"
              value={isSystemOnline ? 100 : 0}
              icon={Activity}
              description={isSystemOnline ? "All systems nominal" : "System offline"}
              trend={isSystemOnline ? "Operational" : "Offline"}
              trendDirection={isSystemOnline ? "up" : "down"}
            />
          </>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Alerts Chart Section */}
        <section className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Alert Volume</h2>
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-muted-foreground">Last 7 days</span>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            <AlertsChart />
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
