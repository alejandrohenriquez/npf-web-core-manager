import { useQuery } from '@tanstack/react-query';
import { projectsService } from '../services/projectsService';

export function useProjectsListQuery() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectsService.getProjects,
    refetchInterval: 4000,
  });
}
