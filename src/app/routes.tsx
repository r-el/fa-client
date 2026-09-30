import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/app/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";

const OverviewPage = lazy(() => import("@/pages/OverviewPage"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const CamerasPage = lazy(() => import("@/pages/CamerasPage"));
const LiveVideoPage = lazy(() => import("@/features/live/LiveVideoPage"));
const WatchlistsPage = lazy(() => import("@/features/watchlists/WatchlistsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const UserManagementPage = lazy(() => import("@/pages/UserManagementPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));

function PageLoadingFallback() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 bg-white/10" />
        <Skeleton className="h-4 w-72 bg-white/5" />
      </div>
      <Skeleton className="h-72 w-full rounded-2xl bg-white/5" />
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export function AppRoutes() {
  return (
    <AppShell>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Protected><OverviewPage /></Protected>} />
          <Route path="/alerts" element={<Protected><AlertsPage /></Protected>} />
          <Route path="/events" element={<Navigate to="/alerts" replace />} />
          <Route path="/cameras" element={<Protected><CamerasPage /></Protected>} />
          <Route path="/cameras/:id/live" element={<Protected><LiveVideoPage /></Protected>} />
          <Route path="/watchlists" element={<Protected><WatchlistsPage /></Protected>} />
          <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
          <Route path="/users" element={<Protected><UserManagementPage /></Protected>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
