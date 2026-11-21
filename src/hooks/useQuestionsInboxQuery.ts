import { useQuery } from '@tanstack/react-query';
import { questionsService } from '../services/questionsService';

export function useQuestionsInboxQuery(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: () => questionsService.getQuestions(filters),
    refetchInterval: 4000,
  });
}
