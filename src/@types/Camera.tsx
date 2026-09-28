export interface ICamera {
  id: string;
  name: string;
  connection_string: string;
  created_by: string;
  specter_camera_id?: string | null;
  organization_id?: string | null;
  created_at: string;
  updated_at: string;
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
