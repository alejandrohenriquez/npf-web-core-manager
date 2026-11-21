import React from 'react';
import { ProjectRepository } from '../../types';
import { Badge } from '../../components/ui/badge';

interface ProjectRepositoryMatrixProps {
  repositories: ProjectRepository[];
}

export const ProjectRepositoryMatrix: React.FC<ProjectRepositoryMatrixProps> = ({ repositories }) => {
  if (!repositories || repositories.length === 0) {
    return <div className="p-8 text-center text-slate-500">No hay repositorios registrados para este proyecto.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
          <tr>
            <th className="px-4 py-3 align-middle whitespace-nowrap">Repositorio</th>
            <th className="px-4 py-3 align-middle whitespace-nowrap">Capa / Tipo</th>
            <th className="px-4 py-3 align-middle whitespace-nowrap">Specs Vigentes</th>
            <th className="px-4 py-3 align-middle whitespace-nowrap">Ruta Local</th>
            <th className="px-4 py-3 align-middle whitespace-nowrap">Último Escaneo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {repositories.map((repo) => (
            <tr key={repo.id} className="hover:bg-slate-50 transition">
              <td className="px-4 py-2.5 align-middle whitespace-nowrap font-medium text-slate-900 font-mono text-xs">
                {repo.name}
              </td>
              <td className="px-4 py-2.5 align-middle whitespace-nowrap">
                <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
                  {repo.repo_type}
                </Badge>
              </td>
              <td className="px-4 py-2.5 align-middle whitespace-nowrap">
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-slate-800">{repo.specs_count}</span>
                  {repo.specs_inventory && repo.specs_inventory.length > 0 && (
                    <span className="text-xs text-slate-400 truncate max-w-[260px]">
                      ({repo.specs_inventory.slice(0, 3).join(', ')}{repo.specs_inventory.length > 3 ? '...' : ''})
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2.5 align-middle font-mono text-xs text-slate-500 max-w-xs truncate" title={repo.repo_path}>
                {repo.repo_path || '—'}
              </td>
              <td className="px-4 py-2.5 align-middle whitespace-nowrap text-xs text-slate-500">
                {repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'Reciente'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
