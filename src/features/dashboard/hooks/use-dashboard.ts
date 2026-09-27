import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { getAlertSummary } from "@/features/alerts/api/alerts";

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

export const useGetStatsOverTime = (days = 7) => {
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
        return {
          timeBucket: day.toISOString(),
          count: counts.get(day.toISOString().slice(0, 10)) ?? 0,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });
};
