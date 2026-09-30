import React, { useState } from "react";
import axios from "axios";
import { createUser } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";

interface UserFormData {
  username: string;
  password: string;
  name: string;
  email: string;
  role: string;
}

const UserCreationForm: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "viewer"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getRoleOptions = () => {
    if (currentUser?.role === "admin") {
      return [
        { value: "operator", label: "Operator" },
        { value: "viewer", label: "Viewer" }
      ];
    } else if (currentUser?.role === "operator") {
      return [
        { value: "viewer", label: "Viewer" }
      ];
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!formData.username || !formData.password || !formData.name || !formData.email) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const response = await createUser(formData);
      if (response.success) {
        setSuccess(`User "${formData.name}" created successfully`);
        setFormData({
          username: "",
          password: "",
          name: "",
          email: "",
          role: "viewer"
        });
      } else {
        setError(response.error || "Failed to create user");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setError("Authentication required. Please login again.");
        } else if (error.response?.status === 403) {
          setError("You don't have permission to create this type of user.");
        } else {
          setError(error.message || "Failed to create user");
        }
      } else {
        setError((error as Error)?.message || "Failed to create user");
      }
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = getRoleOptions();

  if (roleOptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
        <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
        <p>You do not have permission to create users.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Create New User</h2>
      
      {error && <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400">{error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium text-muted-foreground">Username *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter username"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-muted-foreground">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter full name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Enter email address"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium text-muted-foreground">Role *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              required
              className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-background">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-muted-foreground">Password *</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="flex h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Enter password (min 6 characters)"
            minLength={6}
          />
        </div>

        <div className="pt-4 flex justify-end">
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create User"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserCreationForm;
