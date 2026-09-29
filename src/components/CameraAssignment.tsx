import React, { useState, useEffect } from "react";
import { getAllCameras, assignCameraToUser } from "../services/cameraService";
import { getAllUsers } from "../services/userService";
import type { ICamera } from "../@types/Camera";
import type { IUser } from "../@types/User";
import { Button } from "@/components/ui/button";

const CameraAssignment: React.FC = () => {
  const [cameras, setCameras] = useState<ICamera[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    loadCameras();
    loadUsers();
  }, []);

  const loadCameras = async () => {
    try {
      const response = await getAllCameras();
      if (response.success && response.data) {
        setCameras(response.data);
      } else {
        setError(response.error || "Failed to load cameras");
      }
    } catch (error) {
      const err = error as any;
      if (err.response?.status === 401) setError("Authentication required.");
      else if (err.response?.status === 403) setError("No permission to view cameras.");
      else setError(err.message || "Failed to load cameras");
    }
  };

  const loadUsers = async () => {
    try {
      const response = await getAllUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError(response.error || "Failed to load users");
      }
    } catch (error) {
      const err = error as any;
      if (err.response?.status === 401) setError("Authentication required.");
      else if (err.response?.status === 403) setError("No permission to view users.");
      else setError(err.message || "Failed to load users");
    }
  };

  const handleAssignCamera = async () => {
    if (!selectedCamera || !selectedUser) {
      setError("Please select both camera and user");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await assignCameraToUser(selectedCamera, selectedUser);
      if (response.success) {
        setSuccess("Camera assigned successfully!");
        setSelectedCamera("");
        setSelectedUser("");
      } else {
        setError(response.error || "Failed to assign camera");
      }
    } catch (error) {
      const err = error as any;
      if (err.response?.status === 401) setError("Authentication required.");
      else if (err.response?.status === 403) setError("No permission to assign cameras.");
      else setError(err.message || "Failed to assign camera");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-4">Camera Assignment</h2>
        
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-muted-foreground mb-6">
          <p className="font-medium text-foreground mb-2">Permission Requirements:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Only <strong>Admin</strong> and <strong>Operator</strong> roles can assign cameras</li>
            <li>If you see permission errors, please check your role with an administrator</li>
          </ul>
        </div>
        
        {error && <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400">{error}</div>}
        {success && <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{success}</div>}

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="camera-select" className="text-sm font-medium text-muted-foreground">Select Camera:</label>
              <select
                id="camera-select"
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="" className="bg-background">Choose a camera...</option>
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id} className="bg-background">
                    {camera.name} ({camera.specter_camera_id || camera.id})
                  </option>
                ))}
              </select>
              {cameras.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No cameras available. Check your permissions.</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="user-select" className="text-sm font-medium text-muted-foreground">Select User:</label>
              <select
                id="user-select"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="" className="bg-background">Choose a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id} className="bg-background">
                    {user.name} ({user.username}) - {user.role}
                  </option>
                ))}
              </select>
              {users.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No users available. Check your permissions.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleAssignCamera}
              disabled={loading || !selectedCamera || !selectedUser}
            >
              {loading ? "Assigning..." : "Assign Camera"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-medium mb-3">How Camera Assignment Works</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Camera assignment allows you to control which users can view specific cameras. 
          This is part of the role-based access control system.
        </p>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
          <li><strong className="text-foreground">Admin</strong>: Can assign any camera to any user</li>
          <li><strong className="text-foreground">Operator</strong>: Can assign cameras to viewer users</li>
          <li><strong className="text-foreground">Viewer</strong>: Can only view cameras assigned to them</li>
        </ul>
      </div>
    </div>
  );
};

export default CameraAssignment;
