import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ProjectRepository } from '../../types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

interface ProjectRepositoryMatrixProps {
  repositories: ProjectRepository[];
  constitutionRepositoryId?: string | null;
  onSetConstitutionRepository?: (repositoryRef: string | null) => Promise<void>;
}

export const ProjectRepositoryMatrix: React.FC<ProjectRepositoryMatrixProps> = ({
  repositories,
  constitutionRepositoryId,
  onSetConstitutionRepository,
}) => {
  const [updatingRepoId, setUpdatingRepoId] = useState<string | null>(null);

  if (!repositories || repositories.length === 0) {
    return <div className="p-8 text-center text-slate-500">No hay repositorios registrados para este proyecto.</div>;
  }

  const handleToggleConstitution = async (repo: ProjectRepository, isCurrent: boolean) => {
    if (!onSetConstitutionRepository) return;
    setUpdatingRepoId(repo.id);
    try {
      await onSetConstitutionRepository(isCurrent ? null : repo.id);
    } finally {
      setUpdatingRepoId(null);
    }
  };

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
            {onSetConstitutionRepository && (
              <th className="px-4 py-3 align-middle whitespace-nowrap text-right">Constitución</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {repositories.map((repo) => {
            const isConstitution = !!constitutionRepositoryId && repo.id === constitutionRepositoryId;
            return (
              <tr key={repo.id} className="hover:bg-slate-50 transition">
                <td className="px-4 py-2.5 align-middle whitespace-nowrap font-medium text-slate-900 font-mono text-xs">
                  <div className="flex items-center space-x-2">
                    <span>{repo.name}</span>
                    {isConstitution && (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-sans inline-flex items-center space-x-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Constitución</span>
                      </Badge>
                    )}
                  </div>
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
                {onSetConstitutionRepository && (
                  <td className="px-4 py-2.5 align-middle whitespace-nowrap text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingRepoId === repo.id}
                      onClick={() => handleToggleConstitution(repo, isConstitution)}
                      className="text-xs h-7 px-2.5"
                    >
                      {updatingRepoId === repo.id
                        ? 'Guardando...'
                        : isConstitution
                          ? 'Desvincular'
                          : 'Designar Constitución'}
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
