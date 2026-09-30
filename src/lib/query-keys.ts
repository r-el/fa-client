import type { AlertFilters, AlertSummaryFilters } from "@/features/alerts/api/alerts";

/**
 * Hierarchical Query Key Factory for TanStack Query.
 * Standardizes cache keys, invalidation, and refetching across features.
 */
export const cameraKeys = {
  all: ["cameras"] as const,
  lists: () => [...cameraKeys.all] as const,
  detail: (id?: string) => [...cameraKeys.all, "detail", id] as const,
};

export const watchlistKeys = {
  all: ["watchlists"] as const,
  targets: (watchlistId: string) => ["targets", watchlistId] as const,
  batch: (batchId: string) => ["enrollment-batches", batchId] as const,
};

export const alertKeys = {
  all: ["alerts"] as const,
  list: (filters: AlertFilters = {}) => ["alerts", "list", filters] as const,
  detail: (id: string) => ["alerts", "detail", id] as const,
  summary: (filters: AlertSummaryFilters = {}) => ["alerts", "summary", filters] as const,
  snapshot: (id: string) => ["alerts", "snapshot", id] as const,
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => ["dashboard", "stats"] as const,
  chart: (days: number) => ["alerts", "chart", days] as const,
};
