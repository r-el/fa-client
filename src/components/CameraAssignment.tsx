import React, { useState, useEffect, useCallback } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getAllCameras,
  assignCameraToUser,
  getCameraAssignments,
  removeCameraAssignment,
} from "../services/cameraService";
import { getAllUsers } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import type { ICamera } from "../@types/Camera";
import type { IUser } from "../@types/User";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, UserCheck, ShieldAlert } from "lucide-react";

interface AssignmentRecord {
  id?: string;
  camera_id: string;
  user_id: string;
  assigned_by?: string;
  assigned_at?: string;
}

const CameraAssignment: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [cameras, setCameras] = useState<ICamera[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const loadCameras = useCallback(async () => {
    try {
      const response = await getAllCameras();
      if (response.success && response.data) {
        setCameras(response.data);
      } else {
        setError(response.error || "Failed to load cameras");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load cameras", { forbidden: "No permission to view cameras." }));
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const response = await getAllUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError(response.error || "Failed to load users");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load users", { forbidden: "No permission to view users." }));
    }
  }, []);

  const loadAssignmentsForCamera = useCallback(async (cameraId: string) => {
    if (!cameraId) {
      setAssignments([]);
      return;
    }
    try {
      setLoadingAssignments(true);
      const response = await getCameraAssignments(cameraId);
      if (response.success && Array.isArray(response.data)) {
        setAssignments(response.data as AssignmentRecord[]);
      } else {
        setAssignments([]);
      }
    } catch (err) {
      // If table doesn't exist or no permission, catch gracefully
      const msg = getApiErrorMessage(err, "Failed to load camera assignments");
      if (msg.includes("camera_assignments") || msg.includes("schema cache")) {
        setError("Supabase table 'camera_assignments' is missing. Please run camera_assignments_table.sql in Supabase.");
      }
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    void loadCameras();
    void loadUsers();
  }, [loadCameras, loadUsers]);

  useEffect(() => {
    if (selectedCamera) {
      void loadAssignmentsForCamera(selectedCamera);
    } else {
      setAssignments([]);
    }
  }, [selectedCamera, loadAssignmentsForCamera]);

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
        setSelectedUser("");
        await loadAssignmentsForCamera(selectedCamera);
      } else {
        setError(response.error || "Failed to assign camera");
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to assign camera", {
        forbidden: "Only the camera creator or an admin can manage its assignments.",
      });
      if (message.includes("camera_assignments") || message.includes("schema cache")) {
        setError("Database table 'camera_assignments' is missing in Supabase. Run dashboard/docs/db/supabase/camera_assignments_table.sql to create it.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (userId: string) => {
    if (!selectedCamera) return;

    try {
      setRemovingUserId(userId);
      setError("");
      setSuccess("");

      const response = await removeCameraAssignment(selectedCamera, userId);
      if (response.success) {
        setSuccess("Camera assignment removed successfully!");
        await loadAssignmentsForCamera(selectedCamera);
      } else {
        setError(response.error || "Failed to remove camera assignment");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to remove assignment", {
        forbidden: "Only the camera creator or an admin can manage its assignments.",
      }));
    } finally {
      setRemovingUserId(null);
    }
  };

  const selectedCameraObj = cameras.find((c) => c.id === selectedCamera);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Camera Assignment</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Grant specific users access to view cameras. Admins can assign any camera, and operators can assign cameras they created.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm">
            {success}
          </div>
        )}

        <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="camera-select" className="text-sm font-medium text-foreground">
                Select Camera:
              </label>
              <select
                id="camera-select"
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="" className="bg-background">Choose a camera...</option>
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id} className="bg-background">
                    {camera.name} {camera.location ? `(${camera.location})` : ""}
                  </option>
                ))}
              </select>
              {cameras.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No cameras available. Check your permissions.</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="user-select" className="text-sm font-medium text-foreground">
                Select User to Assign:
              </label>
              <select
                id="user-select"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                disabled={!selectedCamera}
                className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              >
                <option value="" className="bg-background">Choose a user...</option>
                {users.map((user) => {
                  const isAlreadyAssigned = assignments.some((a) => a.user_id === user.id);
                  return (
                    <option key={user.id} value={user.id} className="bg-background">
                      {user.name} ({user.username}) - {user.role} {isAlreadyAssigned ? "✓ (Assigned)" : ""}
                    </option>
                  );
                })}
              </select>
              {users.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No users available.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleAssignCamera}
              disabled={loading || !selectedCamera || !selectedUser}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Assigning..." : "Assign Camera"}
            </Button>
          </div>
        </div>

        {selectedCamera && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Assigned Users for {selectedCameraObj?.name || "Selected Camera"}
              </h3>
              {loadingAssignments && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {assignments.length === 0 && !loadingAssignments ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
                No users are explicitly assigned to this camera yet.
                {currentUser?.role === "admin" && (
                  <p className="mt-1 text-xs opacity-75">
                    (Administrators always have access to all cameras automatically.)
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                {assignments.map((assignment) => {
                  const targetUser = users.find((u) => u.id === assignment.user_id);
                  const isRemoving = removingUserId === assignment.user_id;

                  return (
                    <div
                      key={assignment.id || assignment.user_id}
                      className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div>
                        <div className="font-medium text-sm text-foreground">
                          {targetUser ? targetUser.name : `User (${assignment.user_id})`}
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                          {targetUser && <span>@{targetUser.username}</span>}
                          {targetUser && <span className="capitalize">{targetUser.role}</span>}
                          {assignment.assigned_at && (
                            <span>Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                        disabled={isRemoving}
                        onClick={() => handleRemoveAssignment(assignment.user_id)}
                      >
                        {isRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-base font-medium mb-3">Permissions & Access Rules</h3>
        <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
          <li>
            <strong className="text-foreground">Admin:</strong> Has access to all cameras automatically and can assign any camera to any user.
          </li>
          <li>
            <strong className="text-foreground">Operator:</strong> Can view and manage cameras they created or cameras assigned to them. Operators can assign access for cameras they created.
          </li>
          <li>
            <strong className="text-foreground">Viewer:</strong> Can only view cameras specifically assigned to them. Viewers cannot manage cameras or assignments.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CameraAssignment;

