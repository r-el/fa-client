import { Home, Bell, Video, Shield, Users, Settings, type LucideIcon } from "lucide-react";

export interface NavRoute {
  href: string;
  label: string;
  icon: LucideIcon;
  prefetch: () => Promise<any>;
  roles?: ("admin" | "operator" | "viewer")[];
  bottomNav?: boolean; // Whether it shows up in the mobile bottom nav
  sidebar?: boolean; // Whether it shows up in the main sidebar area
}

export const APP_ROUTES: NavRoute[] = [
  {
    href: "/",
    label: "Overview",
    icon: Home,
    prefetch: () => import("@/pages/OverviewPage"),
    bottomNav: true,
    sidebar: true,
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: Bell,
    prefetch: () => import("@/pages/AlertsPage"),
    bottomNav: true,
    sidebar: true,
  },
  {
    href: "/cameras",
    label: "Cameras",
    icon: Video,
    prefetch: () => import("@/pages/CamerasPage"),
    bottomNav: true,
    sidebar: true,
  },
  {
    href: "/watchlists",
    label: "Watchlists",
    icon: Shield,
    prefetch: () => import("@/pages/WatchlistsPage"), // We will move this
    roles: ["admin", "operator"],
    bottomNav: true,
    sidebar: true,
  },
  {
    href: "/users",
    label: "Users",
    icon: Users,
    prefetch: () => import("@/pages/UsersPage"), // We will rename this
    roles: ["admin", "operator"],
    bottomNav: true,
    sidebar: true,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    prefetch: () => import("@/pages/SettingsPage"),
    bottomNav: true,
    sidebar: false, // Settings is usually separate in the sidebar footer
  }
];

/** Helper to prefetch a route by href */
export const prefetchRoute = (href: string) => {
  const route = APP_ROUTES.find(r => r.href === href);
  if (route) {
    void route.prefetch();
  }
};
