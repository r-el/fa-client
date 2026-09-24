import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import AlertsPage from "@/pages/AlertsPage";
import CamerasPage from "@/pages/CamerasPage";
import LoginPage from "@/pages/LoginPage";
import MongoPage from "@/pages/MongoPage";
import OverviewPage from "@/pages/OverviewPage";
import PeoplePage from "@/pages/PeoplePage";
import RegisterPage from "@/pages/RegisterPage";
import SettingsPage from "@/pages/SettingsPage";
import UserManagementPage from "@/pages/UserManagementPage";
import LiveVideoPage from "@/features/live/LiveVideoPage";
import WatchlistsPage from "@/features/watchlists/WatchlistsPage";
import { ProtectedRoute } from "@/app/ProtectedRoute";

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Protected><OverviewPage /></Protected>} />
        <Route path="/alerts" element={<Protected><AlertsPage /></Protected>} />
        <Route path="/events" element={<Navigate to="/alerts" replace />} />
        <Route path="/cameras" element={<Protected><CamerasPage /></Protected>} />
        <Route path="/cameras/:id/live" element={<Protected><LiveVideoPage /></Protected>} />
        <Route path="/watchlists" element={<Protected><WatchlistsPage /></Protected>} />
        <Route path="/people" element={<Protected><PeoplePage /></Protected>} />
        <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
        <Route path="/users" element={<Protected><UserManagementPage /></Protected>} />
        <Route path="/mongo" element={<Protected><MongoPage /></Protected>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
