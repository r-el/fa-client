import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Bell, Video, X, Shield, Menu, Users, Settings } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAlertSummary } from "@/features/alerts/hooks/use-alerts";
import { useGetStats } from "@/features/dashboard/hooks/use-dashboard";

const navItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/cameras", label: "Cameras", icon: Video },
  { href: "/watchlists", label: "Watchlists", icon: Shield },
  { href: "/users", label: "Users", icon: Users },
];

const variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0 },
};

export function Sidebar() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
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
        "glass-panel hidden shrink-0 flex-col border border-white/10 p-6 md:flex transition-all duration-300",
        isCollapsed ? "w-[88px]" : "w-64"
      )}
    >
      {/* Header with toggle */}
      <div className={cn("mb-12 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="glow-ring flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-accent/70">
              <Icon icon={Shield} className="h-6 w-6 text-background" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Face</span>
              <h1 className="neon-text text-xl font-semibold">Alert</h1>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="glow-ring flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-accent/70">
            <Icon icon={Shield} className="h-6 w-6 text-background" />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("h-8 w-8 shrink-0", !isCollapsed && "ml-auto")}
        >
          <Icon icon={isCollapsed ? Menu : X} className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.filter((item) => {
          if (item.href === "/watchlists" || item.href === "/users") {
            return user?.role === "admin" || user?.role === "operator";
          }
          return true;
        }).map((item, i) => (
          <motion.div
            key={item.href}
            initial="hidden"
            animate="visible"
            variants={variants}
            transition={{ delay: i * 0.05, duration: 0.35, ease: "easeOut" }}
          >
            <Link
              to={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground",
                pathname === item.href &&
                  "bg-gradient-to-r from-primary/30 to-primary/10 text-foreground shadow-[0_18px_38px_rgba(88,101,242,0.28)]",
                isCollapsed && "justify-center px-3"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-all",
                  pathname === item.href && "bg-primary/50 text-primary-foreground"
                )}
              >
                <Icon icon={item.icon} className="h-5 w-5" />
              </span>
              {!isCollapsed && (
                <>
                  <span className="text-base">{item.label}</span>
                  {item.label === "Alerts" && unreadAlertsCount > 0 && (
                    <span className="ml-auto flex h-6 min-w-6 px-1.5 shrink-0 items-center justify-center rounded-full bg-destructive/80 text-[11px] font-semibold text-destructive-foreground">
                      {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
                    </span>
                  )}
                </>
              )}
              {isCollapsed && item.label === "Alerts" && unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive/80 text-[9px] font-semibold text-destructive-foreground">
                  {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
                </span>
              )}
            </Link>
          </motion.div>
        ))}
      </nav>

      {!isCollapsed && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/3 p-4 text-sm text-muted-foreground"
          >
            <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/80">
              System Health
              <span
                className={cn(
                  "flex h-2.5 w-2.5 items-center justify-center rounded-full",
                  healthIndicatorColor
                )}
              />
            </p>
            <p className="text-sm text-muted-foreground">
              {healthStatusText}
            </p>
          </motion.div>

          <Link
            to="/settings"
            className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
          >
            <Icon icon={Settings} className="h-5 w-5" />
            <span>Settings</span>
          </Link>
        </>
      )}

      {isCollapsed && (
        <Link
          to="/settings"
          className="mt-6 flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground"
          title="Settings"
        >
          <Icon icon={Settings} className="h-5 w-5" />
        </Link>
      )}
    </aside>
  );
}

export default Sidebar;
