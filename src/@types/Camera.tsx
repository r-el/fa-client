export interface ICamera {
  id: string;
  name: string;
  source_url?: string;
  connection_string?: string;
  created_by?: string | null;
  specter_camera_id?: string | null;
  organization_id?: string | null;
  location?: string | null;
  is_enabled?: boolean;
  desired_state?: "running" | "stopped";
  live_status?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CameraFilters {
  status?: 'active' | 'inactive';
  location?: string;
}

export interface CamerasResponse {
  success: boolean;
  message?: string;
  data?: ICamera[];
  total?: number;
  error?: string;
}
