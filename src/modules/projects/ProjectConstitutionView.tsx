import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Copy, Check, Eye, Code, ShieldCheck } from 'lucide-react';
import { projectsService } from '../../services/projectsService';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

interface ProjectConstitutionViewProps {
  projectKey: string;
  onGoToRepositories?: () => void;
}

export const ProjectConstitutionView: React.FC<ProjectConstitutionViewProps> = ({
  projectKey,
  onGoToRepositories,
}) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['project_constitution', projectKey],
    queryFn: () => projectsService.getProjectConstitution(projectKey),
    enabled: !!projectKey,
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white rounded-lg border border-slate-200">
        Cargando Constitución del proyecto...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 rounded-lg border border-rose-200 text-sm">
        No fue posible obtener la Constitución del proyecto `{projectKey}`.
      </div>
    );
  }

  if (!data || !data.has_constitution || !data.content) {
    return (
      <div className="p-10 text-center bg-white rounded-lg border border-slate-200 space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-slate-900">
          Sin Constitución indexada para {projectKey}
        </h2>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          {data?.repository_name ? (
            <>
              El repositorio <span className="font-mono text-slate-700">{data.repository_name}</span> está
              vinculado como Constitución, pero todavía no contiene un archivo{' '}
              <span className="font-mono text-slate-700">CONSTITUTION.md</span> sincronizado.
            </>
          ) : (
            <>
              Crea un repositorio semilla <span className="font-mono text-slate-700">{projectKey.toLowerCase()}-doc-constitution</span>{' '}
              con <span className="font-mono text-slate-700">CONSTITUTION.md</span> (se vinculará automáticamente al sincronizar)
              o designa un repositorio existente desde el Mapa de Repositorios.
            </>
          )}
        </p>
        {onGoToRepositories && (
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={onGoToRepositories}>
              Ir al Mapa de Repositorios
            </Button>
          </div>
        )}
      </div>
    );
  }

  const handleCopy = async () => {
    if (!data.content) return;
    await navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortSha = data.source_sha256 ? data.source_sha256.slice(0, 12) : '—';
  const syncedLabel = data.synced_at ? new Date(data.synced_at).toLocaleString() : '—';

  return (
    <div className="flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-900">Constitución del Proyecto</span>
          {data.repository_name && (
            <Badge variant="secondary" className="font-mono text-xs">
              {data.repository_name}/{data.rel_path || 'CONSTITUTION.md'}
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500">
            SHA: {shortSha} · Sync: {syncedLabel}
          </span>

          <div className="flex rounded-md bg-slate-200/70 p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setViewMode('rendered')}
              className={`px-2 py-0.5 rounded flex items-center space-x-1 transition ${
                viewMode === 'rendered' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Vista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-2 py-0.5 rounded flex items-center space-x-1 transition ${
                viewMode === 'raw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Code className="w-3 h-3" />
              <span>Raw</span>
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleCopy} className="text-xs h-7 px-2.5">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </Button>
        </div>
      </div>

      <div className="p-6">
        {viewMode === 'raw' ? (
          <pre className="text-xs font-mono text-slate-800 whitespace-pre-wrap bg-slate-50 p-4 rounded-md border border-slate-200 overflow-x-auto">
            {data.content}
          </pre>
        ) : (
          <article className="prose prose-slate prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.content}</ReactMarkdown>
          </article>
        )}
      </div>
    </div>
  );
};
