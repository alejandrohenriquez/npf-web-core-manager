import { request } from './apiClient';
import { Change, ChangeArtifact } from '../types';

export const changesService = {
  getChanges: async (projectRef: string, params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Change[]>(`projects/${projectRef}/changes${q}`);
  },

  getChange: async (changeRef: string) => {
    return request<Change>(`changes/${changeRef}`);
  },

  attachChangesToStory: async (storyRef: string, changeIds: string[]) => {
    return request<Change[]>(`stories/${storyRef}/changes/attach`, {
      method: 'POST',
      body: JSON.stringify({ change_ids: changeIds }),
    });
  },

  approveArtifact: async (changeRef: string, artifactId: string) => {
    return request<ChangeArtifact>(`changes/${changeRef}/artifacts/${artifactId}/approve`, {
      method: 'POST',
    });
  },
};
