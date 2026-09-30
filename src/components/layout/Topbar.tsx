import { useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Search, User, RefreshCw, Shield, LogOut, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useUiStore } from "@/stores/ui-store";

const createTitle = (path: string) => {
  if (path === "/" || path.length <= 1) return "Mission Overview";
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/-/g, " "))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" / ");
};

export function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const title = createTitle(pathname);
  const isSoundEnabled = useUiStore((state) => state.isSoundEnabled);
  const toggleSound = useUiStore((state) => state.toggleSound);
  const openCommandPalette = useUiStore((state) => state.openCommandPalette);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="glass-panel mx-4 mt-4 flex flex-col gap-4 border border-white/10 px-4 py-4 md:mx-8 md:mt-6 md:flex-row md:items-center md:justify-between md:px-6 md:py-5 lg:mx-12">
      <div className="space-y-2">
        {/* Mobile logo - only visible on small screens */}
        <div className="flex items-center gap-3 md:hidden">
          <div className="glow-ring flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-accent/70">
            <Icon icon={Shield} className="h-5 w-5 text-background" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">Face</span>
            <span className="neon-text text-lg font-semibold">Alert</span>
          </div>
        </div>

        <p className="hidden text-xs uppercase tracking-[0.35em] text-muted-foreground/80 md:block">
          Specter Command Center
        </p>
        <div className="flex items-center gap-3">
          <h1 className="neon-text text-2xl font-semibold leading-tight md:text-3xl lg:text-4xl">
            {title}
          </h1>
          <span className="glow-ring hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground md:inline-block">
            Live Feed
          </span>
        </div>
        <div className="hidden flex-wrap items-center gap-2 text-xs text-muted-foreground md:flex">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
            Updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
        <button
          type="button"
          onClick={openCommandPalette}
          className="group hidden w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground transition-all hover:border-white/20 hover:bg-white/10 md:flex md:min-w-[240px] lg:min-w-[280px] cursor-pointer text-left"
          aria-label="Open command palette"
        >
          <div className="flex items-center gap-2">
            <Icon icon={Search} className="h-4 w-4 text-muted-foreground/70 transition-colors group-hover:text-primary" />
            <span className="text-sm text-muted-foreground/70">Quick search...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
        <div className="flex items-center justify-end gap-3">
          <div className="glow-ring rounded-2xl border border-white/10 bg-white/5 p-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={openCommandPalette}
              className="h-8 w-8 rounded-lg hover:bg-white/10 transition-all"
              title="Search"
              aria-label="Open search command palette"
            >
              <Icon icon={Search} className="h-4 w-4" />
            </Button>
          </div>
          <div className="glow-ring rounded-2xl border border-white/10 bg-white/5 p-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-white/10 transition-all"
              title="Refresh all data"
            >
              <Icon icon={RefreshCw} className="h-4 w-4" />
            </Button>
          </div>
          <div className="glow-ring rounded-2xl border border-white/10 bg-white/5 p-2">
            <ThemeToggle />
          </div>
          <div className="glow-ring rounded-2xl border border-white/10 bg-white/5 p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              className="h-8 w-8 rounded-lg hover:bg-white/10 transition-all"
              title={isSoundEnabled ? "Mute alert audio" : "Unmute alert audio"}
              aria-label={isSoundEnabled ? "Mute alert audio" : "Unmute alert audio"}
            >
              <Icon icon={isSoundEnabled ? Volume2 : VolumeX} className="h-4 w-4" />
            </Button>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "glow-ring flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-1.5 md:px-4 md:py-2 text-left text-sm text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground cursor-pointer"
                )}
                aria-label="User menu"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/50 to-accent/60 text-background">
                  <Icon icon={User} className="h-5 w-5" />
                </span>
                <span className="hidden flex-col md:flex">
                  <span className="text-sm font-semibold text-foreground">{user?.username || "Operator"}</span>
                  <span className="text-xs text-muted-foreground">{user?.role || "User"}</span>
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3 glass-panel border border-white/10 bg-background/95 backdrop-blur-xl">
              <div className="flex flex-col gap-1 pb-3 mb-2 border-b border-white/10">
                <p className="text-sm font-semibold text-foreground">{user?.name || user?.username || "Operator"}</p>
                {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                <span className="inline-block mt-1 text-[11px] font-medium uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/10 w-fit">
                  {user?.role || "User"}
                </span>
              </div>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start gap-2 text-destructive hover:bg-destructive/15 hover:text-destructive cursor-pointer rounded-xl h-9 px-3 text-sm font-medium"
              >
                <Icon icon={LogOut} className="h-4 w-4" />
                <span>Log out</span>
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
