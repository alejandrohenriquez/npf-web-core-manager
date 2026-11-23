import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsService } from '../services/projectsService';

export function useRepositoryGraphQuery(projectKey?: string) {
  return useQuery({
    queryKey: ['repository_graph', projectKey],
    queryFn: () => projectsService.getRepositoryGraph(projectKey!),
    enabled: !!projectKey,
    refetchInterval: 8000,
  });
}

export function useUpsertRepositoryAliasMutation(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { service_key: string; target_repository: string }) =>
      projectsService.upsertRepositoryAlias(projectKey, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repository_graph', projectKey] });
    },
  });
}

export function useDeleteRepositoryAliasMutation(projectKey: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (serviceKey: string) =>
      projectsService.deleteRepositoryAlias(projectKey, serviceKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repository_graph', projectKey] });
    },
  });
}
