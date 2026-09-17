import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Hook that checks if there's new data available by comparing current time
 * with last successful query time for critical data
 */
export function useNewDataAvailable() {
  const queryClient = useQueryClient();
  const [hasNewData, setHasNewData] = useState(false);
  
  // Check for new data every 5 minutes
  useQuery({
    queryKey: ["newDataCheck"],
    queryFn: async () => {
      const now = Date.now();
      const criticalQueries = ["stats", "alerts", "people", "cameras"];
      
      for (const queryKey of criticalQueries) {
        const queryState = queryClient.getQueryState([queryKey]);
        if (queryState?.dataUpdatedAt) {
          // If data is older than 10 minutes, consider it stale
          const dataAge = now - queryState.dataUpdatedAt;
          if (dataAge > 10 * 60 * 1000) { // 10 minutes
            setHasNewData(true);
            return true;
          }
        }
      }
      
      setHasNewData(false);
      return false;
    },
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider this query stale
  });

  const markDataAsViewed = () => {
    setHasNewData(false);
  };

  return { hasNewData, markDataAsViewed };
}

/**
 * Hook for manual refresh with loading state
 */
export function useManualRefresh() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      // Give queries a moment to start refetching
      await new Promise(resolve => setTimeout(resolve, 100));
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refresh, isRefreshing };
}
