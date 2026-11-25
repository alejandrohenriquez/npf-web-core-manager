import React, { useState } from 'react';
import { OpenQuestion } from '../../types';
import { QuestionInteractiveCard } from './QuestionInteractiveCard';
import { questionsService } from '../../services/questionsService';
import { useQueryClient } from '@tanstack/react-query';
import { Filter } from 'lucide-react';

interface QuestionInboxListProps {
  questions: OpenQuestion[];
}

export const QuestionInboxList: React.FC<QuestionInboxListProps> = ({ questions }) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'ANSWERED' | 'ALL'>('OPEN');
  const [onlyBlocking, setOnlyBlocking] = useState(false);

  const handleAnswer = async (questionId: string, selectedOptions: any[], answerText: string) => {
    await questionsService.answerQuestion(questionId, {
      selected_options: selectedOptions,
      answer_text: answerText,
    });
    queryClient.invalidateQueries({ queryKey: ['questions'] });
    queryClient.invalidateQueries({ queryKey: ['stories'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const handleDismiss = async (questionId: string) => {
    await questionsService.dismissQuestion(questionId);
    queryClient.invalidateQueries({ queryKey: ['questions'] });
    queryClient.invalidateQueries({ queryKey: ['stories'] });
  };

  const filtered = questions.filter((q) => {
    if (statusFilter === 'OPEN' && q.status !== 'OPEN') return false;
    if (statusFilter === 'ANSWERED' && q.status !== 'ANSWERED' && q.status !== 'APPLIED') return false;
    if (onlyBlocking && !q.is_blocking) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <div className="flex rounded-md bg-slate-100 p-0.5 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('OPEN')}
              className={`px-3 py-1 rounded ${
                statusFilter === 'OPEN' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setStatusFilter('ANSWERED')}
              className={`px-3 py-1 rounded ${
                statusFilter === 'ANSWERED' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Respondidas
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded ${
                statusFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Todas
            </button>
          </div>
        </div>

        <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyBlocking}
            onChange={(e) => setOnlyBlocking(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500"
          />
          <span>Solo Bloqueantes</span>
        </label>
      </div>

      {/* Questions Cards List */}
      <div className="space-y-4">
        {filtered.map((q) => (
          <QuestionInteractiveCard
            key={q.id}
            question={q}
            onAnswer={handleAnswer}
            onDismiss={handleDismiss}
          />
        ))}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400 bg-white rounded-lg border border-slate-200">
            No hay preguntas en esta vista.
          </div>
        )}
      </div>
    </div>
  );
};
