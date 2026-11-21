import { useQuery } from '@tanstack/react-query';
import { changesService } from '../services/changesService';

export function useUngroupedChangesQuery(projectKey: string, filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['changes', projectKey, 'ungrouped', filters],
    queryFn: () => changesService.getChanges(projectKey, { ungrouped: 'true', ...(filters || {}) }),
    enabled: !!projectKey,
    refetchInterval: 4000,
  });
}
