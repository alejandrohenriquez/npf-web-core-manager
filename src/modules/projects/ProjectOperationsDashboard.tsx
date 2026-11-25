import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileText,
  GitBranch,
  HelpCircle,
  Kanban,
  Layers,
  Link2,
  ListTodo,
  Sparkles,
} from 'lucide-react';
import { useProjectDashboardQuery } from '../../hooks/useProjectDashboardQuery';
import { changesService } from '../../services/changesService';
import { storiesService } from '../../services/storiesService';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Sheet } from '../../components/ui/sheet';
import { StoryDetailSheet } from '../stories/StoryDetailSheet';
import { StoryTaskReadOnlyList } from '../stories/StoryTaskReadOnlyList';
import { OpenSpecArtifactGraph, OpenSpecStageKey } from '../openspec/OpenSpecArtifactGraph';
import { OpenSpecArtifactReadOnlyViewer } from '../openspec/OpenSpecArtifactReadOnlyViewer';
import { Change, DashboardCompletedChangeItem, Story } from '../../types';

interface ProjectOperationsDashboardProps {
  projectKey: string;
}

type PendingFilter = 'ALL' | 'TODO' | 'BACKLOG';

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'hace unos segundos';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

function formatFinishTimestamp(isoDate: string): { absolute: string; relative: string } {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return { absolute: '—', relative: '' };
  }
  const absolute = new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return {
    absolute,
    relative: formatRelativeTime(isoDate),
  };
}

export const ProjectOperationsDashboard: React.FC<ProjectOperationsDashboardProps> = ({
  projectKey,
}) => {
  const queryClient = useQueryClient();
  const { data: dashboard, isLoading, isError } = useProjectDashboardQuery(projectKey, 10);

  const [pendingFilter, setPendingFilter] = useState<PendingFilter>('ALL');
  const [selectedStoryKey, setSelectedStoryKey] = useState<string | null>(null);
  const [inspectedChangeRef, setInspectedChangeRef] = useState<string | null>(null);
  const [inspectTab, setInspectTab] = useState<'tasks' | 'artifacts'>('tasks');
  const [selectedArtifactPath, setSelectedArtifactPath] = useState<string>('');

  const { data: selectedStoryDetail } = useQuery({
    queryKey: ['story', selectedStoryKey],
    queryFn: () => (selectedStoryKey ? storiesService.getStory(selectedStoryKey) : null),
    enabled: !!selectedStoryKey,
    refetchInterval: 4000,
  });

  const { data: inspectedChangeDetail } = useQuery<Change | null>({
    queryKey: ['change_detail', inspectedChangeRef],
    queryFn: () => (inspectedChangeRef ? changesService.getChange(inspectedChangeRef) : null),
    enabled: !!inspectedChangeRef,
    refetchInterval: 4000,
  });

  const filteredPendingStories = useMemo(() => {
    const items = dashboard?.pending_stories || [];
    if (pendingFilter === 'ALL') return items;
    return items.filter((s) => s.status === pendingFilter);
  }, [dashboard?.pending_stories, pendingFilter]);

  const priorityDotClass: Record<string, string> = {
    LOW: 'bg-slate-400',
    MEDIUM: 'bg-blue-500',
    HIGH: 'bg-amber-500',
    CRITICAL: 'bg-red-600',
  };

  const handleSelectStageFromGraph = (stage: OpenSpecStageKey) => {
    const arts = inspectedChangeDetail?.artifacts || [];
    let target = arts[0]?.rel_path || '';
    if (stage === 'proposal') {
      target = arts.find((a) => a.rel_path.includes('proposal.md'))?.rel_path || target;
    } else if (stage === 'specs') {
      target =
        arts.find((a) => a.rel_path.startsWith('specs/') || a.rel_path.includes('spec.md'))
          ?.rel_path || target;
    } else if (stage === 'design') {
      target = arts.find((a) => a.rel_path.includes('design.md'))?.rel_path || target;
    } else if (stage === 'tasks') {
      target = arts.find((a) => a.rel_path.includes('tasks.md'))?.rel_path || target;
    }
    if (target) {
      setSelectedArtifactPath(target);
    }
    setInspectTab('artifacts');
  };

  const handleApproveInspectedArtifact = async (artifactId: string) => {
    if (!inspectedChangeDetail) return;
    await changesService.approveArtifact(
      inspectedChangeDetail.key || inspectedChangeDetail.id,
      artifactId,
    );
    queryClient.invalidateQueries({ queryKey: ['change_detail', inspectedChangeRef] });
  };

  const renderChangePhaseBadge = (phase: DashboardCompletedChangeItem['phase']) => {
    if (phase === 'ARCHIVED') {
      return (
        <Badge variant="success" className="text-[10px] font-semibold">
          ✓ Archivado
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="text-[10px] font-semibold bg-purple-100 text-purple-800 border-purple-200"
      >
        ✓ Verifying
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-400">
        Cargando Dashboard Operativo de {projectKey}...
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="p-8 rounded-xl bg-white border border-red-200 text-center space-y-3">
        <p className="text-sm font-medium text-red-700">
          No se pudo cargar el Dashboard Operativo para {projectKey}.
        </p>
        <Link to="/">
          <Button variant="outline" size="sm">
            Volver al inicio
          </Button>
        </Link>
      </div>
    );
  }

  const lastStoryTime = dashboard.last_completed_story
    ? formatFinishTimestamp(dashboard.last_completed_story.finished_at)
    : null;
  const lastChangeTime = dashboard.last_completed_change
    ? formatFinishTimestamp(dashboard.last_completed_change.finished_at)
    : null;

  return (
    <div className="space-y-6">
      {/* Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {dashboard.project_key}
              </span>
              <h1 className="text-xl font-bold text-slate-900">{dashboard.project_name}</h1>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Auto-sync 4s</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dashboard Operativo · Pendientes, últimos cierres y preguntas abiertas
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link to={`/projects/${projectKey}`}>
            <Button variant="outline" size="sm" className="flex items-center space-x-1.5 text-xs">
              <Kanban className="w-4 h-4" />
              <span>Tablero Kanban</span>
            </Button>
          </Link>
          <Link to={`/projects/${projectKey}/changes`}>
            <Button variant="outline" size="sm" className="flex items-center space-x-1.5 text-xs">
              <Layers className="w-4 h-4" />
              <span>Changes & Repos</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Pending Total */}
        <Card className="p-5 border-slate-200 bg-white flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tareas Pendientes
            </span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ListTodo className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-900 tabular-nums">
              {dashboard.pending_total}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
              <span className="font-medium text-blue-700">{dashboard.todo_count} Todo</span>
              <span>·</span>
              <span className="font-medium text-slate-600">{dashboard.backlog_count} Backlog</span>
              {(dashboard.in_progress_count > 0 || dashboard.in_review_count > 0) && (
                <>
                  <span>·</span>
                  <span className="text-amber-700">
                    {dashboard.in_progress_count + dashboard.in_review_count} en curso
                  </span>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* KPI 2: Latest Completed Story */}
        <Card className="p-5 border-slate-200 bg-white flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Última Story Terminada
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          {dashboard.last_completed_story ? (
            <button
              type="button"
              onClick={() => setSelectedStoryKey(dashboard.last_completed_story!.key)}
              className="text-left group"
            >
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {dashboard.last_completed_story.key}
                </span>
                <span className="text-xs font-medium text-slate-900 truncate group-hover:text-indigo-600">
                  {dashboard.last_completed_story.title}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">{lastStoryTime?.absolute}</span>
                <span>({lastStoryTime?.relative})</span>
                {dashboard.last_completed_story.is_estimated_time && (
                  <span className="text-[10px] text-slate-400" title="Basado en última actualización">
                    aprox.
                  </span>
                )}
              </div>
            </button>
          ) : (
            <div className="text-xs text-slate-400 py-1">Aún no hay stories terminadas</div>
          )}
        </Card>

        {/* KPI 3: Latest Completed Change */}
        <Card className="p-5 border-slate-200 bg-white flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Último Change Terminado
            </span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          {dashboard.last_completed_change ? (
            <button
              type="button"
              onClick={() => {
                setInspectedChangeRef(
                  dashboard.last_completed_change!.key || dashboard.last_completed_change!.id,
                );
                setInspectTab('tasks');
                setSelectedArtifactPath('');
              }}
              className="text-left group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600">
                  {dashboard.last_completed_change.key ||
                    dashboard.last_completed_change.change_slug}
                </span>
                {renderChangePhaseBadge(dashboard.last_completed_change.phase)}
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate mt-1">
                {dashboard.last_completed_change.repository_name || 'repositorio'}
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium text-slate-700">{lastChangeTime?.absolute}</span>
                <span>({lastChangeTime?.relative})</span>
                {dashboard.last_completed_change.is_estimated_time && (
                  <span className="text-[10px] text-slate-400" title="Basado en última sincronización">
                    aprox.
                  </span>
                )}
              </div>
            </button>
          ) : (
            <div className="text-xs text-slate-400 py-1">Aún no hay changes terminados</div>
          )}
        </Card>

        {/* KPI 4: Open Questions */}
        <Card className="p-5 border-slate-200 bg-white flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Preguntas Abiertas
            </span>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                dashboard.open_questions_count > 0
                  ? 'bg-amber-50 text-amber-600'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-3xl font-bold text-slate-900 tabular-nums">
                {dashboard.open_questions_count}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {dashboard.blocking_questions_count > 0 ? (
                  <span className="font-semibold text-amber-700">
                    {dashboard.blocking_questions_count} bloqueante(s)
                  </span>
                ) : (
                  <span>Sin bloqueos activos</span>
                )}
              </div>
            </div>
            <Link to={`/questions?project=${dashboard.project_key}`}>
              <Button
                variant={dashboard.open_questions_count > 0 ? 'outline' : 'ghost'}
                size="sm"
                className={
                  dashboard.open_questions_count > 0
                    ? 'text-xs text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-xs text-slate-600'
                }
              >
                {dashboard.open_questions_count > 0 ? 'Responder' : 'Ver bandeja'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Main Split Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Pending Stories (Backlog & Todo) */}
        <Card className="lg:col-span-7 border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tareas Pendientes ({dashboard.pending_total})
              </h2>
              <p className="text-xs text-slate-500">
                Historias en estado Todo y Backlog ordenadas por prioridad
              </p>
            </div>

            <div className="flex rounded-md bg-slate-100 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setPendingFilter('ALL')}
                className={`px-3 py-1 rounded transition ${
                  pendingFilter === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({dashboard.pending_total})
              </button>
              <button
                type="button"
                onClick={() => setPendingFilter('TODO')}
                className={`px-3 py-1 rounded transition ${
                  pendingFilter === 'TODO'
                    ? 'bg-white text-blue-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todo ({dashboard.todo_count})
              </button>
              <button
                type="button"
                onClick={() => setPendingFilter('BACKLOG')}
                className={`px-3 py-1 rounded transition ${
                  pendingFilter === 'BACKLOG'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Backlog ({dashboard.backlog_count})
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
            {filteredPendingStories.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                No hay historias pendientes en esta categoría.
              </div>
            ) : (
              filteredPendingStories.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStoryKey(st.key)}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1.5 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          priorityDotClass[st.priority] || 'bg-blue-500'
                        }`}
                        title={`Prioridad: ${st.priority}`}
                      />
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        {st.key}
                      </span>
                      <Badge
                        variant={st.status === 'TODO' ? 'default' : 'secondary'}
                        className={
                          st.status === 'TODO'
                            ? 'text-[10px] bg-blue-100 text-blue-800 border-blue-200'
                            : 'text-[10px]'
                        }
                      >
                        {st.status}
                      </Badge>
                      {st.epic && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: st.epic.color || '#6366f1' }}
                          />
                          <span className="truncate max-w-[180px]">{st.epic.title}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-slate-900 leading-snug">{st.title}</p>

                    <div className="flex items-center flex-wrap gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {st.changes_count} {st.changes_count === 1 ? 'change' : 'changes'}
                      </span>
                      {st.tasks_total > 0 && (
                        <span className="font-mono tabular-nums">
                          {st.tasks_completed}/{st.tasks_total} tareas ({st.progress_pct}%)
                        </span>
                      )}
                      {st.pending_dependencies_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <Link2 className="w-3 h-3" />
                          {st.pending_dependencies_count} dep. pendiente(s)
                        </span>
                      )}
                      {st.open_questions_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <HelpCircle className="w-3 h-3" />
                          {st.open_questions_count} pregunta(s)
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Right Column: Recent Completed Stories & Changes */}
        <div className="lg:col-span-5 space-y-6">
          {/* Recent Completed Stories */}
          <Card className="border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Últimas Stories Terminadas</h2>
                <p className="text-xs text-slate-500">Historias cerradas en estado DONE</p>
              </div>
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {dashboard.recent_completed_stories.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No hay stories completadas aún.
                </div>
              ) : (
                dashboard.recent_completed_stories.map((st) => {
                  const ts = formatFinishTimestamp(st.finished_at);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStoryKey(st.key)}
                      className="w-full text-left px-5 py-3 hover:bg-slate-50 transition space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {st.key}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {st.title}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 flex-shrink-0">
                          {ts.absolute}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>
                          {st.tasks_completed}/{st.tasks_total} tareas · {ts.relative}
                          {st.is_estimated_time ? ' (aprox.)' : ''}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Recent Completed Changes (ARCHIVED + VERIFYING) */}
          <Card className="border-slate-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Últimos Changes Terminados</h2>
                <p className="text-xs text-slate-500">
                  Changes archivados (ARCHIVED) o listos para archivo (VERIFYING)
                </p>
              </div>
              <GitBranch className="w-4 h-4 text-purple-500" />
            </div>

            <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
              {dashboard.recent_completed_changes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No hay changes terminados aún.
                </div>
              ) : (
                dashboard.recent_completed_changes.map((ch) => {
                  const ts = formatFinishTimestamp(ch.finished_at);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setInspectedChangeRef(ch.key || ch.id);
                        setInspectTab('tasks');
                        setSelectedArtifactPath('');
                      }}
                      className="w-full text-left px-5 py-3 hover:bg-slate-50 transition space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-800 truncate">
                            {ch.key || ch.change_slug}
                          </span>
                          {renderChangePhaseBadge(ch.phase)}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 flex-shrink-0">
                          {ts.absolute}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <span className="font-mono truncate">
                          {ch.repository_name || 'repositorio'}
                          {ch.story_key ? ` · ${ch.story_key}` : ''}
                        </span>
                        <span className="flex-shrink-0">
                          {ch.tasks_completed}/{ch.tasks_total} tareas · {ts.relative}
                          {ch.is_estimated_time ? ' (aprox.)' : ''}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Story Detail Drawer */}
      <StoryDetailSheet
        open={!!selectedStoryKey}
        onClose={() => setSelectedStoryKey(null)}
        story={(selectedStoryDetail as Story | null) || null}
      />

      {/* Completed Change Detail Drawer */}
      <Sheet
        open={!!inspectedChangeRef && !!inspectedChangeDetail}
        onClose={() => setInspectedChangeRef(null)}
        title={
          inspectedChangeDetail
            ? `${inspectedChangeDetail.key ? inspectedChangeDetail.key + ' — ' : ''}${
                inspectedChangeDetail.change_slug
              }`
            : 'Detalle del Change'
        }
      >
        {inspectedChangeDetail && (
          <div className="space-y-5">
            <OpenSpecArtifactGraph
              artifactStatus={inspectedChangeDetail.artifact_status || {}}
              skipSpecs={inspectedChangeDetail.skip_specs}
              onSelectStage={handleSelectStageFromGraph}
            />

            <div className="flex border-b border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setInspectTab('tasks')}
                className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
                  inspectTab === 'tasks'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  Tareas & OpenSpec ({inspectedChangeDetail.tasks_completed}/
                  {inspectedChangeDetail.tasks_total})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setInspectTab('artifacts')}
                className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
                  inspectTab === 'artifacts'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  Visor de Artefactos OpenSpec ({inspectedChangeDetail.artifacts?.length || 0})
                </span>
              </button>
            </div>

            {inspectTab === 'tasks' ? (
              <StoryTaskReadOnlyList
                tasks={inspectedChangeDetail.tasks || []}
                artifacts={inspectedChangeDetail.artifacts || []}
                change={inspectedChangeDetail}
                syncedAt={inspectedChangeDetail.synced_at}
                onOpenArtifactInTab={(relPath) => {
                  setSelectedArtifactPath(relPath);
                  setInspectTab('artifacts');
                }}
              />
            ) : (
              <OpenSpecArtifactReadOnlyViewer
                artifacts={inspectedChangeDetail.artifacts || []}
                onApproveArtifact={handleApproveInspectedArtifact}
                selectedPath={selectedArtifactPath}
                onSelectPathChange={setSelectedArtifactPath}
              />
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
};
