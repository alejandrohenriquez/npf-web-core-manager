import { useQuery } from '@tanstack/react-query';
import { storiesService } from '../services/storiesService';

export function useStoriesBoardQuery(projectKey: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['stories', projectKey, filters],
    queryFn: () => storiesService.getStories(projectKey, filters),
    enabled: !!projectKey,
    refetchInterval: 4000,
  });
}
