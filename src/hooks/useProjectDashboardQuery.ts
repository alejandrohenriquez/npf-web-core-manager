import { useQuery } from '@tanstack/react-query';
import { projectsService } from '../services/projectsService';

export function useProjectDashboardQuery(projectKey: string, recentLimit = 30) {
  return useQuery({
    queryKey: ['project_dashboard', projectKey, recentLimit],
    queryFn: () => projectsService.getProjectDashboard(projectKey, recentLimit),
    enabled: !!projectKey,
    refetchInterval: 4000,
  });
}
