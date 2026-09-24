import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import type { CameraDetails } from "@/services/cameras";
import { getAlertSummary } from "@/features/alerts/api/alerts";

// ===== DASHBOARD STATS =====

export type DashboardStats = {
  activeCameras: number;
  todaysEvents: number;
  highRiskAlerts: number;
  systemStatus: string;
};

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const { data } = await api.get("/dashboard/stats");
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

// ===== CAMERAS =====

export type CameraSummary = CameraDetails;

const fetchCameras = async (signal: AbortSignal): Promise<CameraSummary[]> => {
  const { data } = await api.get("/cameras", { signal });
  if (!data.success || !Array.isArray(data.data)) throw new Error("Invalid camera response.");
  return data.data;
};

export const useGetCameras = () => {
  return useQuery({
    queryKey: ["cameras"],
    queryFn: ({ signal }) => fetchCameras(signal),
    staleTime: 10_000,
    // Also reconcile changes if Socket.IO is unavailable; never poll hidden tabs.
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
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
    const { data } = await api.get("/events/people");
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

// ===== STATS OVER TIME =====

export const useGetStatsOverTime = (days: number = 7) => {
  return useQuery({
    queryKey: ["alerts", "chart", days],
    queryFn: async ({ signal }) => {
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      since.setUTCDate(since.getUTCDate() - days);
      const summary = await getAlertSummary({ created_since: since.toISOString() }, signal);
      const counts = new Map<string, number>();
      summary.daily_counts.forEach(({ day, count }) => counts.set(day, (counts.get(day) ?? 0) + count));
      return Array.from({ length: days + 1 }, (_, offset) => {
        const day = new Date(since);
        day.setUTCDate(day.getUTCDate() + offset);
        return { timeBucket: day.toISOString(), count: counts.get(day.toISOString().slice(0, 10)) ?? 0 };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
};
