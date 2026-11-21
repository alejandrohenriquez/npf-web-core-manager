import React, { useState } from 'react';
import { StoryLog } from '../../types';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/input';
import { MessageSquare, GitCommit, HelpCircle, CheckCircle2 } from 'lucide-react';

interface StoryActivityTimelineProps {
  logs: StoryLog[];
  onAddComment: (content: string) => Promise<void>;
}

export const StoryActivityTimeline: React.FC<StoryActivityTimelineProps> = ({ logs, onAddComment }) => {
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(comment);
      setComment('');
    } finally {
      setSubmitting(false);
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'QUESTION_ANSWERED':
        return <HelpCircle className="w-3.5 h-3.5 text-amber-600" />;
      case 'STATUS_CHANGE':
        return <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* New comment input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Escribir una nota o comentario en la bitácora..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="text-xs"
        />
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="sm" disabled={submitting || !comment.trim()}>
            {submitting ? 'Guardando...' : 'Añadir Comentario'}
          </Button>
        </div>
      </form>

      {/* Timeline items */}
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="flex space-x-3 text-xs">
            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 border border-slate-200">
              {getLogIcon(log.log_type)}
            </div>
            <div className="flex-1 bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span className="font-semibold text-slate-700">{log.author_type}</span>
                <span>{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div className="text-slate-800">{log.content}</div>
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-400">
            No hay actividad registrada en la bitácora de esta historia.
          </div>
        )}
      </div>
    </div>
  );
};
