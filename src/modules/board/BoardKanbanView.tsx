import React from 'react';
import { BoardStoryCard } from './BoardStoryCard';
import { Story } from '../../types';

interface BoardKanbanViewProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
}

export const BoardKanbanView: React.FC<BoardKanbanViewProps> = ({ stories, onStoryClick }) => {
  const columns: { id: Story['status']; label: string; color: string }[] = [
    { id: 'BACKLOG', label: 'Backlog', color: 'border-slate-300' },
    { id: 'TODO', label: 'Por Hacer (Todo)', color: 'border-blue-400' },
    { id: 'IN_PROGRESS', label: 'En Progreso', color: 'border-amber-400' },
    { id: 'IN_REVIEW', label: 'En Revisión', color: 'border-purple-400' },
    { id: 'DONE', label: 'Completadas', color: 'border-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
      {columns.map((col) => {
        const colStories = stories.filter((s) => s.status === col.id);

        return (
          <div
            key={col.id}
            className="flex flex-col rounded-xl bg-slate-100/70 p-3 min-h-[500px] border border-slate-200"
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between pb-3 mb-3 border-b-2 ${col.color}`}>
              <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                {col.label}
              </span>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                {colStories.length}
              </span>
            </div>

            {/* Stories Cards */}
            <div className="space-y-3 overflow-y-auto">
              {colStories.map((story) => (
                <BoardStoryCard
                  key={story.id}
                  story={story}
                  onClick={() => onStoryClick(story)}
                />
              ))}

              {colStories.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  Sin historias
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
