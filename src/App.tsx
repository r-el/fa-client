import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { QueryProvider } from "./components/QueryProvider";
import { Toaster } from "./components/ui/sonner";
import { AppShell } from "./components/layout/AppShell";

import OverviewPage from "./pages/OverviewPage";
import AlertsPage from "./pages/AlertsPage";
import CamerasPage from "./pages/CamerasPage";
import PeoplePage from "./pages/PeoplePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SettingsPage from "./pages/SettingsPage"; // Keep existing
import UserManagementPage from "./pages/UserManagementPage"; // Keep existing
import MongoPage from "./pages/MongoPage"; // Keep existing

// Basic ProtectedRoute implementation
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryProvider>
        <AuthProvider>
          <Router>
            <AppShell>
              <Routes>
                {/* Protected Routes */}
                <Route path="/" element={<ProtectedRoute><OverviewPage /></ProtectedRoute>} />
                <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />
                <Route path="/events" element={<Navigate to="/alerts" replace />} /> {/* Redirect old events route */}
                <Route path="/cameras" element={<ProtectedRoute><CamerasPage /></ProtectedRoute>} />
                <Route path="/people" element={<ProtectedRoute><PeoplePage /></ProtectedRoute>} />
                
                {/* Keep existing protected routes */}
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
                <Route path="/mongo" element={<ProtectedRoute><MongoPage /></ProtectedRoute>} />

                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </Router>
          <Toaster />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
