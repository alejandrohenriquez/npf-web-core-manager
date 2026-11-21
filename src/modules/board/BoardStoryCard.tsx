import React from 'react';
import { HelpCircle, CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Story, Change } from '../../types';

interface BoardStoryCardProps {
  story: Story;
  onClick: () => void;
}

export const BoardStoryCard: React.FC<BoardStoryCardProps> = ({ story, onClick }) => {
  const priorityColors = {
    LOW: 'text-slate-500',
    MEDIUM: 'text-blue-500',
    HIGH: 'text-amber-500 font-semibold',
    CRITICAL: 'text-red-600 font-bold',
  }[story.priority || 'MEDIUM'];

  const getPhaseBadge = (phase: string) => {
    switch (phase) {
      case 'ARCHIVED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">📦 ARCHIVED</span>;
      case 'VERIFYING':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-semibold">🔍 VERIFYING</span>;
      case 'APPLYING':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">⚡ APPLYING</span>;
      case 'READY':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">✓ READY</span>;
      case 'BLOCKED':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-mono">⛔ BLOCKED</span>;
      case 'PLANNING':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-mono">📝 PLANNING</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">⏳ {phase}</span>;
    }
  };

  const visibleChanges = story.changes ? story.changes.slice(0, 4) : [];
  const hiddenChangesCount = story.changes ? Math.max(0, story.changes.length - 4) : 0;

  return (
    <Card
      onClick={onClick}
      className="p-3.5 hover:shadow-md cursor-pointer transition border-slate-200 bg-white space-y-2.5"
    >
      {/* Header: Key, external refs, Priority, Questions Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
            {story.key}
          </span>
          {story.external_refs && story.external_refs.map((ref) => (
            <span key={ref} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {ref}
            </span>
          ))}
        </div>

        <div className="flex items-center space-x-1.5">
          <span className={`text-[11px] ${priorityColors}`}>{story.priority}</span>
          {story.open_questions_count > 0 && (
            <span className="flex items-center text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
              <HelpCircle className="w-3 h-3 mr-0.5" />
              {story.open_questions_count}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-slate-900 leading-snug line-clamp-2">
        {story.title}
      </h4>

      {/* Epic Tag if any */}
      {story.epic && (
        <div className="flex items-center space-x-1 text-[11px]">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: story.epic.color || '#6366f1' }}
          />
          <span className="text-slate-500 truncate">{story.epic.title}</span>
        </div>
      )}

      {/* Mini lanes of member changes by repo */}
      {story.changes && story.changes.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-slate-100">
          {visibleChanges.map((ch) => (
            <div key={ch.id} className="flex items-center justify-between text-xs gap-1">
              <span
                className="font-mono text-[11px] text-slate-600 truncate max-w-[140px]"
                title={`${ch.key ? ch.key + ' · ' : ''}${ch.repository_name || ''}: ${ch.change_slug || ch.name}`}
              >
                {ch.change_slug || ch.repository_name || ch.name}
              </span>
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                {getPhaseBadge(ch.phase)}
                {ch.tasks_total > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {ch.tasks_completed}/{ch.tasks_total}
                  </span>
                )}
              </div>
            </div>
          ))}
          {hiddenChangesCount > 0 && (
            <div className="text-[10px] font-mono text-indigo-600 font-medium pt-0.5">
              +{hiddenChangesCount} changes más (clic para ver tareas y OpenSpec)
            </div>
          )}
        </div>
      )}

      {/* Bottom aggregated progress bar */}
      {story.tasks_total > 0 && (
        <div className="pt-1.5 border-t border-slate-100">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
            <span>Progreso</span>
            <span>{story.tasks_completed}/{story.tasks_total} ({story.progress_pct}%)</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${story.progress_pct}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
};
