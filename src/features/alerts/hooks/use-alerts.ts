import { useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAlert, getAlert, getAlerts, getAlertSnapshot, getAlertSummary,
  resolveAlert, retryAlertRead,
} from "@/features/alerts/api/alerts";
import type { AlertFilters, AlertResolution, AlertSummaryFilters, SpecterAlert } from "@/features/alerts/api/alerts";

export const alertKeys = {
  all: ["alerts"] as const,
  list: (filters: AlertFilters) => ["alerts", "list", filters] as const,
  detail: (id: string) => ["alerts", "detail", id] as const,
  summary: (filters: AlertSummaryFilters) => ["alerts", "summary", filters] as const,
  snapshot: (id: string) => ["alerts", "snapshot", id] as const,
};

const readOptions = {
  retry: retryAlertRead,
  retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 2000),
  // Explicit refresh is available; focus must not restart exhausted 404 retries.
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export function useAlerts(filters: AlertFilters = {}) {
  return useInfiniteQuery({
    queryKey: alertKeys.list(filters),
    queryFn: ({ pageParam, signal }) => getAlerts(filters, pageParam, signal),
    initialPageParam: "",
    getNextPageParam: (page, _pages, previousCursor, cursors) => {
      const next = page.next_cursor;
      // A repeated cursor must not create an infinite request loop.
      return next && next !== previousCursor && !cursors.includes(next) ? next : undefined;
    },
    staleTime: 30_000,
    ...readOptions,
  });
}

export function useAlert(id: string) {
  return useQuery({
    queryKey: alertKeys.detail(id),
    queryFn: ({ signal }) => getAlert(id, signal),
    enabled: Boolean(id),
    ...readOptions,
  });
}

export function useAlertSummary(filters: AlertSummaryFilters = {}) {
  return useQuery({
    queryKey: alertKeys.summary(filters),
    queryFn: ({ signal }) => getAlertSummary(filters, signal),
    staleTime: 30_000,
    ...readOptions,
  });
}

export function useAlertSnapshot(id: string, enabled: boolean) {
  const query = useQuery({
    queryKey: alertKeys.snapshot(id),
    queryFn: ({ signal }) => getAlertSnapshot(id, signal),
    enabled: enabled && Boolean(id),
    gcTime: 0,
    staleTime: Infinity,
    ...readOptions,
  });
  const [image, setImage] = useState<{ blob: Blob; id: string; url: string } | null>(null);
  useEffect(() => {
    if (!enabled || !query.data) return;
    const url = URL.createObjectURL(query.data);
    setImage({ blob: query.data, id, url });
    return () => URL.revokeObjectURL(url);
  }, [enabled, id, query.data]);
  return {
    ...query,
    // Never briefly show the previous alert's image when the selection changes.
    url: enabled && image?.id === id && image.blob === query.data ? image.url : null,
  };
}

export function useAlertActions() {
  const queryClient = useQueryClient();
  const onSuccess = async (alert: SpecterAlert) => {
    queryClient.setQueryData(alertKeys.detail(alert.id), alert);
    await Promise.all([
      // Prefix invalidation also covers ['alerts', 'summary', filters].
      queryClient.invalidateQueries({ queryKey: alertKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] }),
    ]);
  };
  const acknowledge = useMutation({ mutationFn: acknowledgeAlert, onSuccess, retry: false });
  const resolve = useMutation({
    mutationFn: ({ id, disposition, note }: { id: string; disposition: AlertResolution; note?: string }) =>
      resolveAlert(id, disposition, note),
    onSuccess,
    retry: false,
  });
  return { acknowledge, resolve };
}