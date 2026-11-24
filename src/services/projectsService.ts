import { request } from './apiClient';
import {
  Project,
  ProjectConstitutionResponse,
  ProjectRepository,
  Epic,
  RepositoryGraphResponse,
  RepositoryServiceAlias,
} from '../types';

export const projectsService = {
  getProjects: async () => {
    const res = await request<{ items?: Project[]; data?: Project[] }>('projects');
    return res.items || res.data || [];
  },

  getProject: async (projectRef: string) => {
    return request<Project>(`projects/${projectRef}`);
  },

  createProject: async (payload: { key: string; name: string; description?: string; workspace_path?: string }) => {
    return request<Project>('projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateProject: async (projectRef: string, payload: Partial<Project>) => {
    return request<Project>(`projects/${projectRef}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getRepositories: async (projectRef: string) => {
    return request<ProjectRepository[]>(`projects/${projectRef}/repositories`);
  },

  getProjectConstitution: async (projectRef: string, section?: string) => {
    const query = section ? `?section=${encodeURIComponent(section)}` : '';
    return request<ProjectConstitutionResponse>(`projects/${projectRef}/constitution${query}`);
  },

  setConstitutionRepository: async (projectRef: string, repositoryRef: string | null) => {
    return request<Project>(`projects/${projectRef}/constitution-repository`, {
      method: 'PUT',
      body: JSON.stringify({ repository_ref: repositoryRef }),
    });
  },

  getRepositoryGraph: async (projectRef: string, excludeTypes = 'LIB,TEMPLATE,TOOL') => {
    const query = excludeTypes ? `?exclude_types=${encodeURIComponent(excludeTypes)}` : '';
    return request<RepositoryGraphResponse>(`projects/${projectRef}/repository-graph${query}`);
  },

  upsertRepositoryAlias: async (
    projectRef: string,
    payload: { service_key: string; target_repository: string },
  ) => {
    return request<RepositoryServiceAlias>(`projects/${projectRef}/repository-aliases`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteRepositoryAlias: async (projectRef: string, serviceKey: string) => {
    return request<void>(
      `projects/${projectRef}/repository-aliases/${encodeURIComponent(serviceKey)}`,
      { method: 'DELETE' },
    );
  },

  getEpics: async (projectRef: string) => {
    return request<Epic[]>(`projects/${projectRef}/epics`);
  },

  createEpic: async (projectRef: string, payload: { title: string; description?: string; color?: string }) => {
    return request<Epic>(`projects/${projectRef}/epics`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
