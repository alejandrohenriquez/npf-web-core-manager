import React from 'react';
import { Plus, Filter, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Epic, ProjectRepository } from '../../types';

interface BoardFilterToolbarProps {
  epics: Epic[];
  repositories: ProjectRepository[];
  selectedEpic: string;
  onSelectEpic: (epic: string) => void;
  selectedRepo: string;
  onSelectRepo: (repo: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewStoryClick: () => void;
}

export const BoardFilterToolbar: React.FC<BoardFilterToolbarProps> = ({
  epics,
  repositories,
  selectedEpic,
  onSelectEpic,
  selectedRepo,
  onSelectRepo,
  searchQuery,
  onSearchChange,
  onNewStoryClick,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Buscar historias o HU-..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        {/* Epic Filter */}
        <select
          value={selectedEpic}
          onChange={(e) => onSelectEpic(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas las Épicas</option>
          {epics.map((epic) => (
            <option key={epic.id} value={epic.key}>
              {epic.key}: {epic.title}
            </option>
          ))}
        </select>

        {/* Repository Filter */}
        <select
          value={selectedRepo}
          onChange={(e) => onSelectRepo(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los Repositorios</option>
          {repositories.map((repo) => (
            <option key={repo.id} value={repo.name}>
              {repo.name} ({repo.repo_type})
            </option>
          ))}
        </select>
      </div>

      <Button onClick={onNewStoryClick} variant="primary" size="sm" className="flex items-center space-x-1.5">
        <Plus className="w-4 h-4" />
        <span>Nueva Historia</span>
      </Button>
    </div>
  );
};
