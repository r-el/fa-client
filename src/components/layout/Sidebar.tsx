import { Link, useLocation } from "react-router-dom";
import { m } from "framer-motion";
import { X, Shield, Menu, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAlertSummary } from "@/features/alerts/hooks/use-alerts";
import { useGetStats } from "@/features/dashboard/hooks/use-dashboard";
import { useUiStore } from "@/stores/ui-store";


import { APP_ROUTES, prefetchRoute } from "@/app/navigation";

const variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
};

export function Sidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const { data: alertSummary } = useAlertSummary();
  const { data: stats, isLoading: isStatsLoading, isError: isStatsError } = useGetStats();

  const unreadAlertsCount = alertSummary?.unacknowledged_count ?? 0;
  const isHealthy = stats?.systemStatus === "online" || stats?.systemStatus === "operational";
  const isOffline = stats?.systemStatus === "offline";
  const hasNoCameras = stats?.totalCameras === 0;

  const healthIndicatorColor = isStatsLoading
    ? "bg-muted-foreground/40 shadow-none"
    : isStatsError || isOffline
    ? "bg-rose-400 shadow-[0_0_12px_rgba(248,113,113,0.65)]"
    : isHealthy
    ? "bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.65)]"
    : "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.65)]";

  const healthStatusText = isStatsLoading
    ? "Checking system status…"
    : isStatsError
    ? "Status unavailable."
    : isOffline
    ? "System is offline."
    : hasNoCameras
    ? "No cameras configured."
    : isHealthy
    ? "All sensors are operating within nominal parameters."
    : `System status: ${stats?.systemStatus}.`;

  return (
    <aside
      className={cn(
        "glass-panel hidden shrink-0 flex-col border border-white/10 md:flex transition-all duration-300",
        isCollapsed ? "w-[88px] px-0 py-6" : "w-64 p-6"
      )}
    >
      {/* Header with toggle */}
      <div
        className={cn(
          "mb-8 flex items-center transition-all",
          isCollapsed ? "flex-col gap-3 justify-center px-4" : "justify-between"
        )}
      >
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="glow-ring flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-accent/70">
              <Icon icon={Shield} className="h-6 w-6 text-background" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Face</span>
              <h1 className="neon-text text-xl font-semibold">Alert</h1>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleSidebar}
            className="glow-ring flex h-11 w-11 shrink-0 aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-accent/70 transition-transform hover:scale-105 active:scale-95 focus:outline-none"
            title="FaceAlert - Expand sidebar"
            aria-label="Expand sidebar"
          >
            <Icon icon={Shield} className="h-5 w-5 text-background" />
          </button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={cn(
            "shrink-0 transition-all",
            !isCollapsed
              ? "ml-auto h-8 w-8 text-muted-foreground hover:text-foreground"
              : "h-9 w-9 shrink-0 aspect-square rounded-xl border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Icon icon={isCollapsed ? Menu : X} className="h-4 w-4" />
        </Button>
      </div>

      <nav className={cn("flex flex-1 flex-col gap-2.5", isCollapsed ? "items-center px-2" : "")}>
        {APP_ROUTES.filter((item) => {
          if (!item.sidebar) return false;
          if (item.roles && user?.role) {
            return item.roles.includes(user.role);
          }
          return true;
        }).map((item, i) => (
          <m.div
            key={item.href}
            initial="hidden"
            animate="visible"
            variants={variants}
            transition={{ delay: i * 0.05, duration: 0.35, ease: "easeOut" }}
            className={cn("w-full", isCollapsed && "flex justify-center")}
          >
            <Link
              to={item.href}
              onMouseEnter={() => prefetchRoute(item.href)}
              className={cn(
                "group relative flex items-center transition-all duration-200",
                isCollapsed
                  ? "h-11 w-11 shrink-0 aspect-square justify-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:bg-white/10 hover:text-foreground"
                  : "gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground",
                pathname === item.href &&
                  (isCollapsed
                    ? "border-primary/50 bg-gradient-to-br from-primary/30 to-primary/10 text-foreground shadow-[0_0_20px_rgba(88,101,242,0.35)]"
                    : "bg-gradient-to-r from-primary/30 to-primary/10 text-foreground shadow-[0_18px_38px_rgba(88,101,242,0.28)]")
              )}
              title={isCollapsed ? item.label : undefined}
            >
              {!isCollapsed ? (
                <>
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all",
                      pathname === item.href && "bg-primary/50 text-primary-foreground"
                    )}
                  >
                    <Icon icon={item.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-base">{item.label}</span>
                  {item.label === "Alerts" && unreadAlertsCount > 0 && (
                    <span className="ml-auto flex h-6 min-w-6 px-1.5 shrink-0 items-center justify-center rounded-full bg-destructive/80 text-[11px] font-semibold text-destructive-foreground">
                      {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Icon icon={item.icon} className="h-5 w-5 shrink-0" />
                  {item.label === "Alerts" && unreadAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive/90 text-[9px] font-semibold text-destructive-foreground shadow-sm">
                      {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          </m.div>
        ))}
      </nav>

      {!isCollapsed && (
        <>
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/3 p-4 text-sm text-muted-foreground"
          >
            <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/80">
              System Health
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                {isHealthy && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                )}
                <span
                  className={cn(
                    "relative inline-flex h-2.5 w-2.5 rounded-full",
                    healthIndicatorColor
                  )}
                />
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {healthStatusText}
            </p>
          </m.div>

          <Link
            to="/settings"
            onMouseEnter={() => prefetchRoute("/settings")}
            className={cn(
              "mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground",
              pathname === "/settings" &&
                "border-primary/30 bg-gradient-to-r from-primary/30 to-primary/10 text-foreground shadow-[0_18px_38px_rgba(88,101,242,0.28)]"
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all",
                pathname === "/settings" && "bg-primary/50 text-primary-foreground"
              )}
            >
              <Icon icon={Settings} className="h-5 w-5" />
            </span>
            <span className="text-base">Settings</span>
          </Link>
        </>
      )}

      {isCollapsed && (
        <div className="mt-auto flex justify-center pt-4">
          <Link
            to="/settings"
            onMouseEnter={() => prefetchRoute("/settings")}
            className={cn(
              "flex h-11 w-11 shrink-0 aspect-square items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-foreground",
              pathname === "/settings" &&
                "border-primary/50 bg-gradient-to-br from-primary/30 to-primary/10 text-foreground shadow-[0_0_20px_rgba(88,101,242,0.35)]"
            )}
            title="Settings"
          >
            <Icon icon={Settings} className="h-5 w-5 shrink-0" />
          </Link>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
