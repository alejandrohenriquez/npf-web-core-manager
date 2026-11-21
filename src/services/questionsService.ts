import { request } from './apiClient';
import { OpenQuestion } from '../types';

export const questionsService = {
  getQuestions: async (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<OpenQuestion[]>(`questions${q}`);
  },

  answerQuestion: async (questionId: string, payload: { selected_options?: any[]; answer_text?: string }) => {
    return request<OpenQuestion>(`questions/${questionId}/answer`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  dismissQuestion: async (questionId: string) => {
    return request<OpenQuestion>(`questions/${questionId}/dismiss`, {
      method: 'PATCH',
    });
  },
};
