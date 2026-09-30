import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, UserPlus, Camera, Loader2, AlertCircle } from "lucide-react";
import { getAllUsers } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import CameraAssignment from "../components/CameraAssignment";
import UserCreationForm from "../components/UserCreationForm";
import type { IUser } from "../@types/User";
import { Button } from "@/components/ui/button";

const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "create" | "assign">("users");

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Unknown date";
      return date.toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersResponse = await getAllUsers();
      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data);
      } else {
        setError(usersResponse.error || "Failed to load users");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) setError("Authentication required. Please login again.");
        else if (error.response?.status === 403) setError("You don't have permission to access user management.");
        else setError(error.message || "Failed to load data");
      } else {
        setError((error as Error)?.message || "Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  };

  const hasAccess = currentUser?.role === "admin" || currentUser?.role === "operator";

  if (!hasAccess) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-rose-400" />
          <h2 className="text-2xl font-semibold text-rose-400">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators and operators can manage users and camera assignments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Welcome, <strong className="text-foreground">{currentUser?.name}</strong> ({currentUser?.role}). 
          Manage system users and their camera assignments.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        <Button 
          variant={activeTab === "users" ? "default" : "ghost"} 
          onClick={() => setActiveTab("users")}
          className="rounded-xl"
        >
          <Users className="mr-2 h-4 w-4" /> View Users ({users.length})
        </Button>
        <Button 
          variant={activeTab === "create" ? "default" : "ghost"} 
          onClick={() => setActiveTab("create")}
          className="rounded-xl"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Create User
        </Button>
        <Button 
          variant={activeTab === "assign" ? "default" : "ghost"} 
          onClick={() => setActiveTab("assign")}
          className="rounded-xl"
        >
          <Camera className="mr-2 h-4 w-4" /> Assign Cameras
        </Button>
      </div>

      <div className="mt-6">
        {loading && (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400 flex justify-between items-center">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadData}>Retry</Button>
          </div>
        )}

        {!loading && !error && activeTab === "users" && (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <div key={user.id} className="glass-panel flex flex-col gap-3 rounded-2xl border border-white/10 p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-lg">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.username}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider
                      ${user.role === 'admin' ? 'bg-primary/20 text-primary' : 
                        user.role === 'operator' ? 'bg-accent/20 text-accent' : 
                        'bg-white/10 text-muted-foreground'}`}>
                      {user.role}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <p><span className="opacity-70">Email:</span> {user.email}</p>
                    <p><span className="opacity-70">Created:</span> {formatDate(user.createdAt)}</p>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  No users found.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-medium mb-4">User Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-xl bg-background/50">
                  <div className="text-2xl font-semibold">{users.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
                </div>
                <div className="p-4 rounded-xl bg-background/50">
                  <div className="text-2xl font-semibold text-primary">{users.filter(u => u.role === "admin").length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Admins</div>
                </div>
                <div className="p-4 rounded-xl bg-background/50">
                  <div className="text-2xl font-semibold text-accent">{users.filter(u => u.role === "operator").length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Operators</div>
                </div>
                <div className="p-4 rounded-xl bg-background/50">
                  <div className="text-2xl font-semibold">{users.filter(u => u.role === "viewer").length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Viewers</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && activeTab === "create" && (
          <div className="glass-panel rounded-2xl border border-white/10 p-6">
            <UserCreationForm />
          </div>
        )}

        {!loading && !error && activeTab === "assign" && (
          <div className="glass-panel rounded-2xl border border-white/10 p-6">
            <CameraAssignment />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementPage;
