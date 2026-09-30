import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Home,
  Moon,
  PanelLeft,
  Settings,
  Shield,
  Sun,
  Users,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { useUiStore } from "@/stores/ui-store";
import { useCameras } from "@/features/cameras";
import { useWatchlists } from "@/features/watchlists";
import { useAlerts } from "@/features/alerts";

export function CommandPalette() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();

  const isOpen = useUiStore((state) => state.isCommandPaletteOpen);
  const setOpen = useUiStore((state) => state.setCommandPaletteOpen);
  const toggleOpen = useUiStore((state) => state.toggleCommandPalette);
  const close = useUiStore((state) => state.closeCommandPalette);
  const isSoundEnabled = useUiStore((state) => state.isSoundEnabled);
  const toggleSound = useUiStore((state) => state.toggleSound);
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleOpen();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleOpen]);

  const runCommand = useCallback(
    (action: () => void) => {
      close();
      action();
    },
    [close]
  );

  const canManageWatchlists =
    isAuthenticated && (user?.role === "admin" || user?.role === "operator");
  const canManageUsers = isAuthenticated && user?.role === "admin";

  // Data queries
  const { data: cameras } = useCameras();
  const { data: watchlists } = useWatchlists();
  const { data: alertsData } = useAlerts({ limit: 5 });
  const recentAlerts = alertsData?.pages?.[0]?.alerts ?? [];

  return (
    <CommandDialog open={isOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command, search cameras, watchlists, alerts..." />
      <CommandList>
        <CommandEmpty>No matching results found.</CommandEmpty>

        {/* Navigation Group */}
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
            <Home className="mr-2 h-4 w-4 text-primary" />
            <span>Overview</span>
            <CommandShortcut>G O</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/alerts"))}>
            <Bell className="mr-2 h-4 w-4 text-amber-400" />
            <span>Alerts</span>
            <CommandShortcut>G A</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate("/cameras"))}>
            <Video className="mr-2 h-4 w-4 text-emerald-400" />
            <span>Cameras</span>
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>
          {canManageWatchlists && (
            <CommandItem onSelect={() => runCommand(() => navigate("/watchlists"))}>
              <Shield className="mr-2 h-4 w-4 text-indigo-400" />
              <span>Watchlists</span>
              <CommandShortcut>G W</CommandShortcut>
            </CommandItem>
          )}
          {canManageUsers && (
            <CommandItem onSelect={() => runCommand(() => navigate("/users"))}>
              <Users className="mr-2 h-4 w-4 text-purple-400" />
              <span>User Management</span>
              <CommandShortcut>G U</CommandShortcut>
            </CommandItem>
          )}
          <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Settings</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(toggleSound)}>
            {isSoundEnabled ? (
              <VolumeX className="mr-2 h-4 w-4 text-destructive" />
            ) : (
              <Volume2 className="mr-2 h-4 w-4 text-emerald-400" />
            )}
            <span>{isSoundEnabled ? "Mute Alert Audio" : "Unmute Alert Audio"}</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(toggleSidebar)}>
            <PanelLeft className="mr-2 h-4 w-4 text-primary" />
            <span>{isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))
            }
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="mr-2 h-4 w-4 text-blue-400" />
            )}
            <span>Toggle {theme === "dark" ? "Light" : "Dark"} Mode</span>
          </CommandItem>
        </CommandGroup>

        {/* Cameras Group */}
        {cameras && cameras.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Cameras">
              {cameras.map((camera) => (
                <CommandItem
                  key={camera.id}
                  value={`camera ${camera.name} ${camera.live_status}`}
                  onSelect={() => runCommand(() => navigate("/cameras"))}
                >
                  <Video className="mr-2 h-4 w-4 text-emerald-400" />
                  <span className="font-medium">{camera.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {camera.live_status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Watchlists Group */}
        {watchlists && watchlists.length > 0 && canManageWatchlists && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Watchlists">
              {watchlists.map((wl) => (
                <CommandItem
                  key={wl.id}
                  value={`watchlist ${wl.name} ${wl.kind} ${wl.target_type}`}
                  onSelect={() => runCommand(() => navigate("/watchlists"))}
                >
                  <Shield className="mr-2 h-4 w-4 text-indigo-400" />
                  <span className="font-medium">{wl.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {wl.target_type} ({wl.kind})
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Recent Alerts Group */}
        {recentAlerts && recentAlerts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent Alerts">
              {recentAlerts.map((alert) => (
                <CommandItem
                  key={alert.id}
                  value={`alert ${alert.kind} ${alert.camera_name ?? ""} ${alert.target_label ?? ""} ${alert.object_class}`}
                  onSelect={() => runCommand(() => navigate("/alerts"))}
                >
                  <Bell className="mr-2 h-4 w-4 text-amber-400" />
                  <span className="truncate font-medium">
                    {alert.target_label
                      ? `${alert.target_label} — ${alert.camera_name ?? "Camera"}`
                      : `${alert.object_class} on ${alert.camera_name ?? "Camera"}`}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground capitalize">
                    {alert.review.disposition}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
