import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache validity
      gcTime: 1000 * 60 * 30, // 30 minutes in memory
      retry: 1,
      refetchOnWindowFocus: false, // Save backend reads on tab focus
      refetchOnReconnect: true, // Auto-sync when reconnecting to network
    },
  },
});
