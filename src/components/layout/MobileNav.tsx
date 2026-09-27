import { Link, useLocation } from "react-router-dom";
import { Home, Bell, Users, Video, Settings, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

const navItems = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/people", label: "People", icon: Users },
  { href: "/cameras", label: "Cameras", icon: Video },
  { href: "/watchlists", label: "Watchlists", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Mobile bottom navigation bar (Instagram-style).
 * Only visible on small screens (md:hidden).
 */
export function MobileNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/10 bg-background/80 backdrop-blur-xl px-2 py-2 md:hidden">
      {navItems.filter((item) => item.href !== "/watchlists" || user?.role === "admin" || user?.role === "operator").map((item) => (
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
              "flex h-8 w-8 items-center justify-center rounded-xl transition-all",
              pathname === item.href
                ? "bg-primary/20 text-primary shadow-[0_4px_12px_rgba(88,101,242,0.3)]"
                : "text-muted-foreground"
            )}
          >
            <Icon icon={item.icon} className="h-5 w-5" />
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
