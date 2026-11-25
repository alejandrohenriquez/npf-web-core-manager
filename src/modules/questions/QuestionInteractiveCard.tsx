import React from 'react';
import { OpenQuestion } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { QuestionAnswerForm } from './QuestionAnswerForm';
import { HelpCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface QuestionInteractiveCardProps {
  question: OpenQuestion;
  onAnswer: (questionId: string, selectedOptions: any[], text: string) => Promise<void>;
  onDismiss: (questionId: string) => Promise<void>;
}

export const QuestionInteractiveCard: React.FC<QuestionInteractiveCardProps> = ({
  question,
  onAnswer,
  onDismiss,
}) => {
  const isAnswered = question.status === 'ANSWERED' || question.status === 'APPLIED';
  const isApplied = question.status === 'APPLIED';

  return (
    <Card className="border-slate-200 overflow-hidden shadow-sm">
      <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3 px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-mono font-bold text-slate-800 bg-slate-200/70 px-2 py-0.5 rounded">
              {question.phase}
            </span>
            {question.is_blocking && (
              <Badge variant="destructive" className="flex items-center space-x-1 text-[10px]">
                <AlertCircle className="w-3 h-3 mr-0.5" />
                <span>Bloqueante</span>
              </Badge>
            )}
          </div>
          <Badge
            variant={isApplied ? 'success' : isAnswered ? 'secondary' : 'warning'}
            className="text-[11px]"
          >
            {isApplied ? 'APPLIED' : isAnswered ? 'ANSWERED · Pend. aplicar' : question.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Question Text */}
        <div className="text-base font-semibold text-slate-900 leading-snug">
          {question.question_text || question.question}
        </div>

        {/* Architectural Context */}
        {question.context && (
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 border border-slate-150 prose prose-xs max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{question.context}</ReactMarkdown>
          </div>
        )}

        {/* If Answered: show response summary */}
        {isAnswered ? (
          <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-3 text-xs space-y-1">
            <div className="font-semibold text-emerald-900">Respuesta Registrada:</div>
            {question.selected_options && question.selected_options.length > 0 && (
              <div className="text-emerald-800">
                Opción: <span className="font-medium">{question.selected_options.join(', ')}</span>
              </div>
            )}
            {question.answer_text && (
              <div className="text-emerald-700 italic">"{question.answer_text}"</div>
            )}
            {question.answered_at && (
              <div className="text-[10px] text-emerald-600 pt-1">
                Respondida el {new Date(question.answered_at).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          /* Interactive Form */
          <QuestionAnswerForm
            question={question}
            onAnswer={(opts, text) => onAnswer(question.id, opts, text)}
            onDismiss={() => onDismiss(question.id)}
          />
        )}
      </CardContent>
    </Card>
  );
};
