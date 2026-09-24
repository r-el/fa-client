import { useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { RealtimeSync } from "@/components/RealtimeSync";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  // Auth pages don't get the shell
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[10%] top-[12%] h-64 w-64 rounded-full bg-primary/40 blur-[120px]" />
        <div className="absolute right-[8%] top-[18%] h-56 w-56 rounded-full bg-accent/35 blur-[120px]" />
        <div className="absolute bottom-[10%] left-1/2 h-80 w-[520px] -translate-x-1/2 rounded-[999px] bg-primary/20 blur-[150px]" />
      </div>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="relative z-10 flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-12 md:pt-10 lg:px-12">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6"><RealtimeSync />{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}

export default AppShell;
