import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/input';
import { OpenQuestion } from '../../types';
import { Sparkles, Check } from 'lucide-react';

interface QuestionAnswerFormProps {
  question: OpenQuestion;
  onAnswer: (selectedOptions: any[], text: string) => Promise<void>;
  onDismiss: () => Promise<void>;
}

export const QuestionAnswerForm: React.FC<QuestionAnswerFormProps> = ({
  question,
  onAnswer,
  onDismiss,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    question.options.filter((o) => o.is_recommended).map((o) => o.id)
  );
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSelectOption = (optId: string) => {
    if (question.question_type === 'SINGLE_SELECT') {
      setSelectedIds([optId]);
    } else if (question.question_type === 'MULTI_SELECT') {
      if (selectedIds.includes(optId)) {
        setSelectedIds(selectedIds.filter((id) => id !== optId));
      } else {
        setSelectedIds([...selectedIds, optId]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onAnswer(selectedIds, comment);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {/* Options list if not FREE_TEXT */}
      {question.options && question.options.length > 0 && (
        <div className="space-y-2">
          {question.options.map((opt) => {
            const isSelected = selectedIds.includes(opt.id);
            const label = opt.label || opt.text || opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer transition ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded ${
                      question.question_type === 'SINGLE_SELECT' ? 'rounded-full' : 'rounded'
                    } border ${
                      isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{label}</div>
                    {opt.description && (
                      <div className="text-xs text-slate-500 mt-0.5">{opt.description}</div>
                    )}
                  </div>
                </div>

                {opt.is_recommended && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-semibold">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>✦ Recomendado por Antigravity</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Free text / Additional comments */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          {question.question_type === 'FREE_TEXT'
            ? 'Respuesta detallada'
            : 'Comentarios o matices adicionales (opcional)'}
        </label>
        <Textarea
          placeholder="Escribe aquí notas adicionales o aclaraciones para Antigravity..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-500 text-xs"
          onClick={onDismiss}
          disabled={submitting}
        >
          Descartar Pregunta
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enviar Respuesta'}
        </Button>
      </div>
    </form>
  );
};
