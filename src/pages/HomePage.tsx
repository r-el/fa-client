import React from "react";
import { useAuth } from "../context/AuthContext";
import { useGetStats } from "../hooks/use-api";
import "./HomePage.css";

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { data: stats, isLoading: loading, error, refetch } = useGetStats({ enabled: isAuthenticated });
  const dashboardStats = stats ?? {
    activeCameras: 0,
    todaysEvents: 0,
    highRiskAlerts: 0,
    systemStatus: 'offline',
  };

  if (!isAuthenticated) {
    return (
      <div className="home-page">
        <div className="welcome-message">
          <h1>Welcome to FaceAlert</h1>
          <p>Please log in to access the face recognition monitoring system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="dashboard-overview">
        <h1>Dashboard Overview</h1>
        <p>Welcome back, {user?.name}!</p>
        
        {error && (
          <div className="error-message">
            {error instanceof Error ? error.message : 'Error loading dashboard data'}
            <button onClick={() => refetch()}>Try Again</button>
          </div>
        )}
        
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Active Cameras</h3>
            <div className="stat-number">
              {loading ? '...' : dashboardStats.activeCameras}
            </div>
          </div>
          
          <div className="stat-card">
            <h3>Today's Events</h3>
            <div className="stat-number">
              {loading ? '...' : dashboardStats.todaysEvents}
            </div>
          </div>
          
          <div className={`stat-card ${dashboardStats.highRiskAlerts > 0 ? 'danger' : ''}`}>
            <h3>High Risk Alerts</h3>
            <div className="stat-number">
              {loading ? '...' : dashboardStats.highRiskAlerts}
            </div>
          </div>
          
          <div className="stat-card">
            <h3>System Status</h3>
            <div className={`stat-status ${dashboardStats.systemStatus === 'online' ? 'online' : 'offline'}`}>
              {loading ? 'Loading...' : (dashboardStats.systemStatus === 'online' ? 'Online' : 'Offline')}
            </div>
          </div>
        </div>
        
        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <a href="/events" className="action-button">View Recent Events</a>
            <a href="/cameras" className="action-button">Manage Cameras</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
