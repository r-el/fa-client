import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { useAlertSummary } from "@/features/alerts/hooks/use-alerts";

import { APP_ROUTES } from "@/app/navigation";

/**
 * Mobile bottom navigation bar (Instagram-style).
 * Only visible on small screens (md:hidden).
 */
export function MobileNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { data: alertSummary } = useAlertSummary();
  const unreadAlertsCount = alertSummary?.unacknowledged_count ?? 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/10 bg-background/80 backdrop-blur-xl px-2 py-2 md:hidden">
      {APP_ROUTES.filter((item) => {
        if (!item.bottomNav) return false;
        if (item.roles && user?.role) {
          return item.roles.includes(user.role);
        }
        return true;
      }).map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-muted-foreground transition-all",
            pathname === item.href && "text-primary"
          )}
        >
          <span
            className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-xl transition-all",
              pathname === item.href
                ? "bg-primary/20 text-primary shadow-[0_4px_12px_rgba(88,101,242,0.3)]"
                : "text-muted-foreground"
            )}
          >
            <Icon icon={item.icon} className="h-5 w-5" />
            {item.label === "Alerts" && unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-destructive/80 text-[9px] font-semibold text-destructive-foreground">
                {unreadAlertsCount > 99 ? "99+" : unreadAlertsCount}
              </span>
            )}
          </span>
          <span className={cn("text-[10px]", pathname === item.href && "text-primary font-semibold")}>
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}

export default MobileNav;
