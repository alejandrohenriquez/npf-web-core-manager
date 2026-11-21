import { request } from './apiClient';
import { Project, ProjectRepository, Epic } from '../types';

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
