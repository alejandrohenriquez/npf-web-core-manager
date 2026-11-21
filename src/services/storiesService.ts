import { request } from './apiClient';
import { Story, StoryLog } from '../types';

export const storiesService = {
  getStories: async (projectRef: string, params?: Record<string, string>) => {
    const cleanParams: Record<string, string> = { limit: '200' };
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          cleanParams[k] = v;
        }
      });
    }
    const q = '?' + new URLSearchParams(cleanParams).toString();
    const res = await request<{ items?: Story[]; data?: Story[] }>(`projects/${projectRef}/stories${q}`);
    return res.items || res.data || [];
  },

  getStory: async (storyRef: string) => {
    return request<Story>(`stories/${storyRef}`);
  },

  createStory: async (projectRef: string, payload: any) => {
    return request<Story>(`projects/${projectRef}/stories`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStory: async (storyRef: string, payload: any) => {
    return request<Story>(`stories/${storyRef}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteStory: async (storyRef: string) => {
    return request<void>(`stories/${storyRef}`, {
      method: 'DELETE',
    });
  },

  getStoryLogs: async (storyRef: string) => {
    return request<StoryLog[]>(`stories/${storyRef}/logs`);
  },

  addStoryLog: async (storyRef: string, payload: { content: string; change_ref?: string; log_type?: string }) => {
    return request<StoryLog>(`stories/${storyRef}/logs`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
