import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import api from "@/lib/api-client";

// ===== DASHBOARD STATS =====

export type DashboardStats = {
  activeCameras: number;
  todaysEvents: number;
  highRiskAlerts: number;
  systemStatus: string;
};

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get("/api/dashboard/stats");
  return data.stats;
};

export const useGetStats = () => {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchDashboardStats,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// ===== EVENTS (Alerts) =====

export type Alert = {
  _id: string;
  camera_id: string;
  person_name: string;
  timestamp: string;
  image_path?: string;
  detection_metadata?: {
    confidence: number;
    bbox?: number[];
  };
};

export type AlertFilters = {
  page_size?: number;
  level?: string;
  message_search?: string;
};

const fetchAlerts = async ({
  pageParam = 1,
  filters = {},
}: {
  pageParam?: number;
  filters?: AlertFilters;
}): Promise<Alert[]> => {
  const params = new URLSearchParams({
    page: pageParam.toString(),
    limit: String(filters.page_size || 20),
  });

  const { data } = await api.get("/api/events?" + params.toString());
  return data.events || data || [];
};

export const useGetAlerts = (filters: AlertFilters = {}) => {
  return useInfiniteQuery<
    Alert[],
    unknown,
    InfiniteData<Alert[], number>,
    [string, AlertFilters],
    number
  >({
    queryKey: ["alerts", filters] as const,
    queryFn: ({ pageParam = 1 }) => fetchAlerts({ pageParam, filters }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < (filters.page_size || 20)) return undefined;
      return allPages.length + 1;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// ===== CAMERAS =====

export type CameraSummary = {
  id: string;
  camera_id: string;
  name: string;
  location: string;
  status: string;
  assigned_users?: string[];
};

const fetchCameras = async (): Promise<CameraSummary[]> => {
  const { data } = await api.get("/api/cameras");
  return data.cameras || data || [];
};

export const useGetCameras = () => {
  return useQuery({
    queryKey: ["cameras"],
    queryFn: fetchCameras,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

// ===== PEOPLE (stub for future API) =====

export type PersonSummary = {
  personId: string;
  alertCount: number;
  firstSeen: string;
  lastSeen: string;
  sampleImagePath?: string;
};

const fetchPeople = async (): Promise<PersonSummary[]> => {
  try {
    const { data } = await api.get("/api/events/people");
    return data || [];
  } catch {
    // People endpoint may not exist yet
    return [];
  }
};

export const useGetPeople = () => {
  return useQuery({
    queryKey: ["people"],
    queryFn: fetchPeople,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};
