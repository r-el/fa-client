import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { RealtimeSync } from "@/features/realtime/RealtimeSync";
import { CommandPalette } from "@/components/CommandPalette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { loading } = useAuth();

  // Auth pages don't get the shell
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  // Prevent rendering the shell (and its navigation) until auth is resolved
  // This eliminates massive layout shifts in the Sidebar/MobileNav when admin routes suddenly appear.
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="glow-ring flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 to-accent/70 shadow-[0_0_40px_rgba(88,101,242,0.4)] animate-pulse">
          <div className="h-8 w-8 rounded-full border-2 border-background border-t-transparent animate-spin" />
        </div>
        <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Initializing System...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[10%] top-[12%] h-64 w-64 rounded-full bg-primary/40 blur-[120px]" />
        <div className="absolute right-[8%] top-[18%] h-56 w-56 rounded-full bg-accent/35 blur-[120px]" />
        <div className="absolute bottom-[10%] left-1/2 h-80 w-[520px] -translate-x-1/2 rounded-[999px] bg-primary/20 blur-[150px]" />
      </div>

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="relative z-10 flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-12 md:pt-10 lg:px-12">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <RealtimeSync />
            <div key={pathname} className="flex flex-col gap-6 animate-in fade-in duration-300 ease-out">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}

export default AppShell;
