import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TaskItem, ChangeArtifact, Change } from '../../types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  CheckCircle2,
  Circle,
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code,
  Eye,
  Copy,
  Layers,
  X,
} from 'lucide-react';

interface StoryTaskReadOnlyListProps {
  tasks: TaskItem[];
  artifacts?: ChangeArtifact[];
  change?: Change;
  syncedAt?: string;
  onOpenArtifactInTab?: (relPath: string) => void;
}

/**
 * Extracts inline backtick code references (file paths, classes, endpoints) from text
 * so they can be highlighted as quick context chips on each task card.
 */
function extractCodeTokens(title: string, description?: string): string[] {
  const combined = `${title} ${description || ''}`;
  const matches = combined.match(/`([^`]+)`/g) || [];
  const cleaned = matches
    .map((m) => m.replace(/`/g, '').trim())
    .filter((token) => token.length > 1 && token.length <= 64);
  return Array.from(new Set(cleaned)).slice(0, 6);
}

export const StoryTaskReadOnlyList: React.FC<StoryTaskReadOnlyListProps> = ({
  tasks,
  artifacts = [],
  change,
  syncedAt,
  onOpenArtifactInTab,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDescriptions, setShowDescriptions] = useState(true);
  const [previewArtifactPath, setPreviewArtifactPath] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState(false);

  // Fallback parser: if tasks table isn't populated yet, parse directly from tasks.md artifact content
  const effectiveTasks: TaskItem[] = useMemo(() => {
    if (tasks && tasks.length > 0) return tasks;
    const tasksArt = artifacts.find((a) => a.rel_path === 'tasks.md' || a.rel_path.endsWith('/tasks.md'));
    if (!tasksArt?.content) return [];

    const lines = tasksArt.content.split('\n');
    const parsed: TaskItem[] = [];
    let currentSection = 'General';
    let lastTask: TaskItem | null = null;

    lines.forEach((rawLine, idx) => {
      const line = rawLine.trimEnd();
      const headingMatch = line.match(/^#{2,3}\s+(.+)$/);
      if (headingMatch) {
        currentSection = headingMatch[1].trim();
        lastTask = null;
        return;
      }
      const taskMatch = line.match(/^\s*-\s*\[([ xX])\]\s*(?:(\d+(?:\.\d+)*)\s+)?(.+)$/);
      if (taskMatch) {
        const isCompleted = taskMatch[1].toLowerCase() === 'x';
        const code = taskMatch[2] || undefined;
        const title = taskMatch[3].trim();
        lastTask = {
          id: `parsed-${idx}`,
          change_id: change?.id || '',
          task_code: code,
          section: currentSection,
          title,
          description: '',
          is_completed: isCompleted,
          position: parsed.length + 1,
          synced_at: tasksArt.synced_at,
        };
        parsed.push(lastTask);
        return;
      }
      if (lastTask && line.trim().length > 0 && (line.startsWith('  ') || line.startsWith('\t') || line.trim().startsWith('>'))) {
        const cleanDesc = line.trim().replace(/^>\s*/, '');
        lastTask.description = lastTask.description ? `${lastTask.description}\n${cleanDesc}` : cleanDesc;
      }
    });

    return parsed;
  }, [tasks, artifacts, change?.id]);

  const totalCount = effectiveTasks.length;
  const completedCount = effectiveTasks.filter((t) => t.is_completed).length;
  const pendingCount = totalCount - completedCount;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return effectiveTasks.filter((t) => {
      if (statusFilter === 'PENDING' && t.is_completed) return false;
      if (statusFilter === 'COMPLETED' && !t.is_completed) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inCode = (t.task_code || '').toLowerCase().includes(q);
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = (t.description || '').toLowerCase().includes(q);
        const inSec = (t.section || '').toLowerCase().includes(q);
        return inCode || inTitle || inDesc || inSec;
      }
      return true;
    });
  }, [effectiveTasks, statusFilter, searchQuery]);

  // Group filtered tasks by section
  const sections = useMemo(() => {
    const map: Record<string, TaskItem[]> = {};
    for (const t of filteredTasks) {
      const sec = t.section || 'General';
      if (!map[sec]) {
        map[sec] = [];
      }
      map[sec].push(t);
    }
    return map;
  }, [filteredTasks]);

  const previewArtifact = useMemo(() => {
    if (!previewArtifactPath) return null;
    return artifacts.find((a) => a.rel_path === previewArtifactPath) || null;
  }, [artifacts, previewArtifactPath]);

  const handleCopyArtifact = async () => {
    if (!previewArtifact?.content) return;
    await navigator.clipboard.writeText(previewArtifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 1. OpenSpec Context & Quick Document Access Bar */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {change?.key && (
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">
                {change.key}
              </span>
            )}
            <span className="font-mono text-xs font-semibold text-slate-800">
              {change?.change_slug || change?.name || 'Change'}
            </span>
            {change?.repository_name && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/70 text-slate-700 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {change.repository_name}
              </span>
            )}
            {change?.phase && (
              <Badge variant={change.phase === 'ARCHIVED' || change.phase === 'VERIFYING' ? 'success' : 'default'}>
                {change.phase}
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="font-mono font-semibold text-slate-700">
              {completedCount}/{totalCount} tareas ({progressPct}%)
            </span>
            {syncedAt && (
              <span className="text-[11px] text-slate-400 font-mono">
                Sync: {new Date(syncedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Quick OpenSpec Artifact Text Access Buttons */}
        {artifacts.length > 0 && (
          <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-indigo-100/80">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-indigo-900 mr-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Texto generado por OpenSpec:</span>
              </span>
              {artifacts.map((art) => {
                const isOpen = previewArtifactPath === art.rel_path;
                return (
                  <button
                    key={art.rel_path}
                    type="button"
                    onClick={() => setPreviewArtifactPath(isOpen ? null : art.rel_path)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono transition flex items-center space-x-1 border ${
                      isOpen
                        ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
                    }`}
                  >
                    <span>{art.rel_path}</span>
                  </button>
                );
              })}
            </div>

            {previewArtifact && onOpenArtifactInTab && (
              <button
                type="button"
                onClick={() => onOpenArtifactInTab(previewArtifact.rel_path)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Abrir en pestaña Artefactos</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Inline Collapsible OpenSpec Text Reader (when user clicks any OpenSpec file above) */}
      {previewArtifact && (
        <div className="rounded-xl border-2 border-indigo-200 bg-white overflow-hidden shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-indigo-50/80 border-b border-indigo-100">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="font-mono text-xs font-bold text-indigo-950">{previewArtifact.rel_path}</span>
              <span className="text-[11px] font-mono text-slate-500">
                (SHA: {previewArtifact.source_sha256.slice(0, 8)})
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex rounded-md bg-white border border-slate-200 p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setPreviewMode('rendered')}
                  className={`px-2 py-0.5 rounded flex items-center space-x-1 ${
                    previewMode === 'rendered' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Markdown</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('raw')}
                  className={`px-2 py-0.5 rounded flex items-center space-x-1 ${
                    previewMode === 'raw' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                  }`}
                >
                  <Code className="w-3 h-3" />
                  <span>Raw</span>
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyArtifact}
                className="h-7 px-2 text-xs bg-white"
              >
                <Copy className="w-3 h-3 mr-1" />
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </Button>

              <button
                type="button"
                onClick={() => setPreviewArtifactPath(null)}
                className="p-1 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                title="Cerrar vista previa OpenSpec"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-5 max-h-[420px] overflow-y-auto bg-white">
            {previewArtifact.content ? (
              previewMode === 'raw' || previewArtifact.rel_path.endsWith('.yaml') ? (
                <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {previewArtifact.content}
                </pre>
              ) : (
                <div className="prose prose-slate prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewArtifact.content}</ReactMarkdown>
                </div>
              )
            ) : (
              <div className="text-xs text-slate-400 italic">Este artefacto no tiene contenido de texto indexado.</div>
            )}
          </div>
        </div>
      )}

      {/* 3. Task Filter, Search & Detail Controls */}
      {totalCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-md bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded transition ${
                  statusFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-slate-600'
                }`}
              >
                Todas ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded transition ${
                  statusFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-sm font-semibold' : 'text-slate-600'
                }`}
              >
                Pendientes ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-2.5 py-1 rounded transition ${
                  statusFilter === 'COMPLETED' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-600'
                }`}
              >
                Completadas ({completedCount})
              </button>
            </div>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                placeholder="Filtrar por código, ruta, clase..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDescriptions(!showDescriptions)}
            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 flex items-center space-x-1"
          >
            {showDescriptions ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Ocultar detalle técnico</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Mostrar detalle técnico</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 4. Empty State if no tasks */}
      {totalCount === 0 ? (
        <div className="py-10 px-4 text-center bg-white rounded-lg border border-slate-200 space-y-2">
          <div className="text-xs text-slate-500 font-medium">
            No hay tareas estructuradas registradas para este Change.
          </div>
          {artifacts.length > 0 && (
            <div className="text-[11px] text-slate-400">
              Usa los botones de <strong>Texto generado por OpenSpec</strong> arriba para leer{' '}
              <span className="font-mono">proposal.md</span>, <span className="font-mono">design.md</span> o{' '}
              <span className="font-mono">specs/</span>.
            </div>
          )}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-lg border border-slate-200">
          Ninguna tarea coincide con el filtro actual.
        </div>
      ) : (
        /* 5. Tasks Grouped by Section with Rich Technical Context */
        Object.entries(sections).map(([sectionName, sectionTasks]) => {
          const secCompleted = sectionTasks.filter((t) => t.is_completed).length;
          const secTotal = sectionTasks.length;
          return (
            <div key={sectionName} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  {sectionName}
                </span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                    secCompleted === secTotal
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {secCompleted}/{secTotal} completadas
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {sectionTasks.map((t) => {
                  const codeTokens = extractCodeTokens(t.title, t.description);

                  return (
                    <div
                      key={t.id}
                      className={`flex items-start space-x-3 px-4 py-3.5 text-xs transition ${
                        t.is_completed ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {t.is_completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-amber-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        {/* Task Header Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {t.task_code && (
                              <span
                                className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border ${
                                  t.is_completed
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                }`}
                              >
                                #{t.task_code}
                              </span>
                            )}
                            <span className="font-semibold text-slate-900 text-[13px] leading-snug">
                              {t.title.replace(/`([^`]+)`/g, '$1')}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                              t.is_completed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t.is_completed ? '✓ Completada' : '⏳ Pendiente'}
                          </span>
                        </div>

                        {/* Extracted Code / File Path Chips */}
                        {codeTokens.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {codeTokens.map((token) => (
                              <span
                                key={token}
                                className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {token}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Rich Markdown Description from OpenSpec tasks.md */}
                        {showDescriptions && t.description && (
                          <div className="mt-1.5 pl-3 border-l-2 border-indigo-200 bg-slate-50/70 rounded-r-md py-2 px-3 text-xs text-slate-700 prose prose-slate prose-xs max-w-none leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.description}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
