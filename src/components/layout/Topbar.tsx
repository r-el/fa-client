import { useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, RefreshCw, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();
  const title = createTitle(pathname);

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
          FaceAlert Command Center
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
        <div className="group hidden w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground transition-colors focus-within:border-primary/60 md:flex md:min-w-[240px] lg:min-w-[280px]">
          <Icon icon={Search} className="h-4 w-4 text-muted-foreground/70 transition-colors group-focus-within:text-primary" />
          <Input
            type="search"
            placeholder="Search alerts, cameras..."
            className="h-auto border-none bg-transparent p-0 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="flex items-center justify-end gap-3">
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
          <Button
            variant="ghost"
            className={cn(
              "glow-ring hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-muted-foreground transition-all hover:bg-white/10 hover:text-foreground md:flex"
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/50 to-accent/60 text-background">
              <Icon icon={User} className="h-5 w-5" />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">{user?.username || "Operator"}</span>
              <span className="text-xs text-muted-foreground">{user?.role || "User"}</span>
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
