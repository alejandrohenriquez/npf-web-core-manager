import React from 'react';
import { HelpCircle, Layers, Link2 } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Story } from '../../types';

interface BoardStoryCardProps {
  story: Story;
  onClick: () => void;
}

export const BoardStoryCard: React.FC<BoardStoryCardProps> = ({ story, onClick }) => {
  const priority = story.priority || 'MEDIUM';
  const priorityDotClass = {
    LOW: 'bg-slate-400',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-amber-500',
    CRITICAL: 'bg-red-600',
  }[priority];

  const pendingDepsCount = story.pending_dependencies_count ?? 0;
  const changesCount = story.changes?.length ?? 0;

  return (
    <Card
      onClick={onClick}
      className="p-3.5 hover:shadow-md cursor-pointer transition border-slate-200 bg-white space-y-2.5"
    >
      {/* Header: Priority dot, Key, and active blocker badges only */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityDotClass}`}
            title={`Prioridad: ${priority}`}
            aria-label={`Prioridad: ${priority}`}
          />
          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
            {story.key}
          </span>
        </div>

        {(pendingDepsCount > 0 || story.open_questions_count > 0) && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {pendingDepsCount > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono font-semibold"
                title={`Dependencias pendientes: ${(story.pending_dependency_keys || []).join(', ')}`}
              >
                <Link2 className="w-3 h-3" />
                {pendingDepsCount}
              </span>
            )}
            {story.open_questions_count > 0 && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold"
                title={`${story.open_questions_count} pregunta(s) abierta(s)`}
              >
                <HelpCircle className="w-3 h-3" />
                {story.open_questions_count}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-slate-900 leading-snug line-clamp-2">
        {story.title}
      </h4>

      {/* Compact metadata row: Epic + Changes counter */}
      {(story.epic || changesCount > 0) && (
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
          {story.epic && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: story.epic.color || '#6366f1' }}
              />
              <span className="truncate">{story.epic.title}</span>
            </div>
          )}

          {changesCount > 0 && (
            <span className="inline-flex items-center gap-1 font-mono text-slate-600 flex-shrink-0 ml-auto">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>
                {changesCount} {changesCount === 1 ? 'change' : 'changes'}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Single-line progress bar */}
      {story.tasks_total > 0 && (
        <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100">
          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${story.progress_pct}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 font-mono tabular-nums flex-shrink-0">
            {story.tasks_completed}/{story.tasks_total} ({story.progress_pct}%)
          </span>
        </div>
      )}
    </Card>
  );
};
