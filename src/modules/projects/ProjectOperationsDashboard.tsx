import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileText,
  GitBranch,
  HelpCircle,
  Kanban,
  Layers,
  Link2,
  Play,
  ShieldAlert,
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
import {
  Change,
  DashboardCompletedChangeItem,
  DashboardExecutionState,
  DashboardReviewItem,
  Story,
} from '../../types';

interface ProjectOperationsDashboardProps {
  projectKey: string;
}

type ReviewFilter = 'ALL' | 'ARTIFACT' | 'QUESTION' | 'OTHER';
type QueueFilter = 'ALL' | 'EXECUTABLE' | 'BLOCKED';
type ClosuresTab = 'STORIES' | 'CHANGES';

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

const PRIORITY_DOT_CLASS: Record<string, string> = {
  LOW: 'bg-slate-400',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-amber-500',
  CRITICAL: 'bg-red-600',
};

const EXECUTION_STATE_META: Record<
  DashboardExecutionState,
  { label: string; className: string }
> = {
  IN_PROGRESS: {
    label: 'En curso',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  READY: {
    label: 'Lista',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  NEEDS_APPROVAL: {
    label: 'Aprobación',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  BLOCKED_QUESTION: {
    label: 'Pregunta',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  VERIFYING: {
    label: 'Verifying',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  PLANNING: {
    label: 'Planning',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  BLOCKED_DEPENDENCY: {
    label: 'Espera dep.',
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
};

function getReviewBadgeMeta(item: DashboardReviewItem): { label: string; className: string } {
  if (item.kind === 'BLOCKING_QUESTION') {
    return { label: 'PREGUNTA', className: 'bg-red-100 text-red-800 border-red-200' };
  }
  if (item.kind === 'ARTIFACT_APPROVAL') {
    if (item.artifact_review_state === 'STALE') {
      return { label: 'STALE', className: 'bg-amber-100 text-amber-900 border-amber-300' };
    }
    if (item.artifact_review_state === 'NEEDS_CHANGES') {
      return { label: 'AJUSTES', className: 'bg-orange-100 text-orange-800 border-orange-200' };
    }
    return { label: 'APROBAR', className: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  if (item.kind === 'VERIFYING_ARCHIVE') {
    return { label: 'VERIFYING', className: 'bg-purple-100 text-purple-800 border-purple-200' };
  }
  if (item.kind === 'PENDING_DEPENDENCY') {
    return { label: 'DEPENDENCIA', className: 'bg-orange-100 text-orange-800 border-orange-200' };
  }
  return { label: 'PLANNING', className: 'bg-slate-100 text-slate-700 border-slate-200' };
}

export const ProjectOperationsDashboard: React.FC<ProjectOperationsDashboardProps> = ({
  projectKey,
}) => {
  const queryClient = useQueryClient();
  const { data: dashboard, isLoading, isError } = useProjectDashboardQuery(projectKey, 10);

  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('ALL');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('ALL');
  const [closuresTab, setClosuresTab] = useState<ClosuresTab>('STORIES');
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

  const reviewItems = dashboard?.review_items || [];
  const executionQueue = dashboard?.execution_queue || [];

  const filteredReviewItems = useMemo(() => {
    if (reviewFilter === 'ALL') return reviewItems;
    if (reviewFilter === 'ARTIFACT') {
      return reviewItems.filter((item) => item.kind === 'ARTIFACT_APPROVAL');
    }
    if (reviewFilter === 'QUESTION') {
      return reviewItems.filter((item) => item.kind === 'BLOCKING_QUESTION');
    }
    return reviewItems.filter(
      (item) => item.kind !== 'ARTIFACT_APPROVAL' && item.kind !== 'BLOCKING_QUESTION',
    );
  }, [reviewItems, reviewFilter]);

  const filteredExecutionQueue = useMemo(() => {
    if (queueFilter === 'ALL') return executionQueue;
    if (queueFilter === 'EXECUTABLE') {
      return executionQueue.filter(
        (st) => st.execution_state === 'IN_PROGRESS' || st.execution_state === 'READY',
      );
    }
    return executionQueue.filter(
      (st) => st.execution_state !== 'IN_PROGRESS' && st.execution_state !== 'READY',
    );
  }, [executionQueue, queueFilter]);

  const openChangeDrawer = (
    changeRef: string,
    tab: 'tasks' | 'artifacts' = 'tasks',
    artifactPath = '',
  ) => {
    setInspectedChangeRef(changeRef);
    setInspectTab(tab);
    setSelectedArtifactPath(artifactPath);
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
    queryClient.invalidateQueries({ queryKey: ['project_dashboard', projectKey] });
  };

  const renderChangePhaseBadge = (phase: DashboardCompletedChangeItem['phase']) => {
    if (phase === 'ARCHIVED') {
      return (
        <Badge variant="success" className="text-[10px] font-semibold px-1.5 py-0">
          ✓ Archivado
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="text-[10px] font-semibold px-1.5 py-0 bg-purple-100 text-purple-800 border-purple-200"
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

  const nextWork = dashboard.next_work;
  const selectedNext = nextWork?.eligible ? nextWork.selected : null;
  const exclusions = nextWork?.exclusions;
  const artifactCount = reviewItems.filter((i) => i.kind === 'ARTIFACT_APPROVAL').length;
  const questionCount = reviewItems.filter((i) => i.kind === 'BLOCKING_QUESTION').length;
  const otherReviewCount = reviewItems.length - artifactCount - questionCount;

  const lastStoryTime = dashboard.last_completed_story
    ? formatFinishTimestamp(dashboard.last_completed_story.finished_at)
    : null;
  const lastChangeTime = dashboard.last_completed_change
    ? formatFinishTimestamp(dashboard.last_completed_change.finished_at)
    : null;

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      {/* Compact Header & Inline Telemetry */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center space-x-3 min-w-0">
          <Link to="/" className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                {dashboard.project_key}
              </span>
              <h1 className="text-base font-bold text-slate-900 truncate">
                {dashboard.project_name}
              </h1>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Auto-sync 4s</span>
              </span>
            </div>
          </div>
        </div>

        {/* Inline Metrics + View Switchers */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium tabular-nums">
              Cola: <strong>{executionQueue.length}</strong>
            </span>
            <span
              className={`px-2.5 py-1 rounded-md font-medium tabular-nums ${
                dashboard.review_items_count > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              Bloqueantes: <strong>{dashboard.review_items_count}</strong>
            </span>
            <Link
              to={`/questions?project=${dashboard.project_key}`}
              className={`px-2.5 py-1 rounded-md font-medium tabular-nums transition ${
                dashboard.open_questions_count > 0
                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Preguntas: <strong>{dashboard.open_questions_count}</strong>
            </Link>
          </div>

          <Link to={`/projects/${projectKey}/kanban`}>
            <Button variant="outline" size="sm" className="flex items-center space-x-1.5 text-xs h-8">
              <Kanban className="w-3.5 h-3.5" />
              <span>Tablero Kanban</span>
            </Button>
          </Link>
          <Link to={`/projects/${projectKey}/changes`}>
            <Button variant="outline" size="sm" className="flex items-center space-x-1.5 text-xs h-8">
              <Layers className="w-3.5 h-3.5" />
              <span>Changes & Repos</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Next Task Spotlight (#1) */}
      {selectedNext ? (
        <div className="shrink-0 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-emerald-50/60 px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white">
                  Siguiente Tarea (#1)
                </span>
                <Badge
                  variant="secondary"
                  className={
                    selectedNext.phase === 'APPLYING'
                      ? 'text-[10px] bg-indigo-100 text-indigo-800 border-indigo-200'
                      : 'text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200'
                  }
                >
                  {selectedNext.phase}
                </Badge>
                <span className="font-mono font-bold text-slate-800">
                  {selectedNext.change_key || selectedNext.change_slug}
                </span>
                {selectedNext.repository_name && (
                  <span className="font-mono text-[11px] text-slate-500">
                    · {selectedNext.repository_name}
                  </span>
                )}
                {selectedNext.story_key && (
                  <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {selectedNext.story_key} · {selectedNext.story_priority}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                {selectedNext.next_task.task_code ? (
                  <span className="font-mono text-indigo-700 mr-1.5">
                    {selectedNext.next_task.task_code}
                  </span>
                ) : null}
                {selectedNext.next_task.title || selectedNext.next_task.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex flex-col items-end gap-1 min-w-[110px]">
              <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                {selectedNext.tasks_completed}/{selectedNext.tasks_total} tareas
              </span>
              <div className="w-28 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full transition-all"
                  style={{
                    width: `${
                      selectedNext.tasks_total > 0
                        ? Math.round((selectedNext.tasks_completed / selectedNext.tasks_total) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 bg-white"
              onClick={() =>
                openChangeDrawer(selectedNext.change_key || selectedNext.change_id, 'tasks')
              }
            >
              Ver Change
            </Button>
            {selectedNext.story_key && (
              <Button
                variant="primary"
                size="sm"
                className="text-xs h-8"
                onClick={() => setSelectedStoryKey(selectedNext.story_key!)}
              >
                Ver Story
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-9 w-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-amber-600 text-white">
                  Pipeline Detenido · Sin Siguiente Tarea (#1)
                </span>
                {exclusions && (
                  <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-amber-900">
                    {exclusions.unapproved_or_stale > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200">
                        {exclusions.unapproved_or_stale} sin aprobar/stale
                      </span>
                    )}
                    {exclusions.blocked_questions > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                        {exclusions.blocked_questions} pregunta(s) bloqueante(s)
                      </span>
                    )}
                    {exclusions.pending_dependencies > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                        {exclusions.pending_dependencies} dep. pendiente(s)
                      </span>
                    )}
                    {exclusions.verifying_ready_to_archive > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                        {exclusions.verifying_ready_to_archive} en Verifying
                      </span>
                    )}
                    {exclusions.planning_or_pending > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {exclusions.planning_or_pending} en Planning
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-amber-950 truncate mt-0.5">
                {nextWork?.message || 'No hay tareas elegibles para implementar en este momento.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3-Column Single-Screen Cockpit */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Column 1: Pending Blocking Reviews */}
        <Card className="lg:col-span-4 border-slate-200 bg-white flex flex-col min-h-[260px] lg:min-h-0 overflow-hidden">
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <ShieldAlert
                  className={`w-4 h-4 ${
                    reviewItems.length > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                />
                <h2 className="text-sm font-bold text-slate-900">
                  Pendientes por Revisar ({reviewItems.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">Bloqueantes</span>
            </div>

            <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setReviewFilter('ALL')}
                className={`flex-1 px-2 py-1 rounded transition ${
                  reviewFilter === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({reviewItems.length})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('ARTIFACT')}
                className={`flex-1 px-2 py-1 rounded transition ${
                  reviewFilter === 'ARTIFACT'
                    ? 'bg-white text-amber-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aprob. ({artifactCount})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('QUESTION')}
                className={`flex-1 px-2 py-1 rounded transition ${
                  reviewFilter === 'QUESTION'
                    ? 'bg-white text-red-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Preg. ({questionCount})
              </button>
              <button
                type="button"
                onClick={() => setReviewFilter('OTHER')}
                className={`flex-1 px-2 py-1 rounded transition ${
                  reviewFilter === 'OTHER'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Otros ({otherReviewCount})
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
            {filteredReviewItems.length === 0 ? (
              <div className="p-8 text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-xs font-medium text-slate-600">
                  Sin elementos bloqueantes pendientes
                </p>
                <p className="text-[11px] text-slate-400">
                  No hay artefactos por aprobar ni preguntas bloqueantes activas.
                </p>
              </div>
            ) : (
              filteredReviewItems.map((item) => {
                const badgeMeta = getReviewBadgeMeta(item);
                const rowTargetChange = item.change_key || item.change_id;

                if (item.kind === 'BLOCKING_QUESTION') {
                  return (
                    <Link
                      key={item.id}
                      to={`/questions?project=${dashboard.project_key}`}
                      className="block px-4 py-2.5 hover:bg-red-50/40 transition space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-semibold px-1.5 py-0 ${badgeMeta.className}`}
                          >
                            {badgeMeta.label}
                          </Badge>
                          {(item.change_key || item.story_key) && (
                            <span className="font-mono text-[11px] font-bold text-slate-700 truncate">
                              {item.change_key || item.story_key}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-red-700 inline-flex items-center gap-0.5 shrink-0">
                          Responder <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 line-clamp-2">
                        {item.title}
                      </p>
                      {item.detail && (
                        <p className="text-[11px] text-slate-500 truncate">{item.detail}</p>
                      )}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.kind === 'ARTIFACT_APPROVAL' && rowTargetChange) {
                        openChangeDrawer(
                          rowTargetChange,
                          'artifacts',
                          item.artifact_rel_path || '',
                        );
                      } else if (rowTargetChange && item.kind !== 'PENDING_DEPENDENCY') {
                        openChangeDrawer(rowTargetChange, 'tasks');
                      } else if (item.story_key) {
                        setSelectedStoryKey(item.story_key);
                      }
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold px-1.5 py-0 ${badgeMeta.className}`}
                        >
                          {badgeMeta.label}
                        </Badge>
                        {item.change_key && (
                          <span className="font-mono text-[11px] font-bold text-slate-800 truncate">
                            {item.change_key}
                          </span>
                        )}
                        {item.repository_name && (
                          <span className="font-mono text-[10px] text-slate-500 truncate">
                            · {item.repository_name}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-700 inline-flex items-center gap-0.5 shrink-0">
                        {item.kind === 'ARTIFACT_APPROVAL' ? 'Revisar' : 'Ver'}{' '}
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-900 truncate">{item.title}</p>
                    {item.detail && (
                      <p className="text-[11px] text-slate-500 truncate">{item.detail}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Column 2: Execution Queue */}
        <Card className="lg:col-span-4 border-slate-200 bg-white flex flex-col min-h-[260px] lg:min-h-0 overflow-hidden">
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Play className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Cola de Ejecución ({executionQueue.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">Orden real del pipeline</span>
            </div>

            <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setQueueFilter('ALL')}
                className={`flex-1 px-2 py-1 rounded transition ${
                  queueFilter === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas ({executionQueue.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter('EXECUTABLE')}
                className={`flex-1 px-2 py-1 rounded transition ${
                  queueFilter === 'EXECUTABLE'
                    ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Listas/En curso
              </button>
              <button
                type="button"
                onClick={() => setQueueFilter('BLOCKED')}
                className={`flex-1 px-2 py-1 rounded transition ${
                  queueFilter === 'BLOCKED'
                    ? 'bg-white text-amber-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                En espera
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
            {filteredExecutionQueue.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No hay historias activas en esta categoría.
              </div>
            ) : (
              filteredExecutionQueue.map((st) => {
                const stateMeta = EXECUTION_STATE_META[st.execution_state] || {
                  label: st.execution_state,
                  className: 'bg-slate-100 text-slate-700 border-slate-200',
                };
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStoryKey(st.key)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-slate-50 transition space-y-1 ${
                      st.is_next_work ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                            st.is_next_work
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          #{st.queue_position}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            PRIORITY_DOT_CLASS[st.priority] || 'bg-blue-500'
                          }`}
                          title={`Prioridad: ${st.priority}`}
                        />
                        <span className="font-mono text-xs font-bold text-indigo-700">
                          {st.key}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold px-1.5 py-0 ${stateMeta.className}`}
                        >
                          {st.is_next_work ? 'Siguiente #1' : stateMeta.label}
                        </Badge>
                      </div>

                      {st.tasks_total > 0 && (
                        <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                          {st.tasks_completed}/{st.tasks_total} ({st.progress_pct}%)
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-slate-900 truncate">{st.title}</p>

                    <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="font-mono">
                        {st.changes_count} {st.changes_count === 1 ? 'change' : 'changes'}
                      </span>
                      {st.epic && (
                        <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: st.epic.color || '#6366f1' }}
                          />
                          <span className="truncate">{st.epic.title}</span>
                        </span>
                      )}
                      {st.pending_dependency_keys.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-orange-700 font-medium">
                          <Link2 className="w-3 h-3" />
                          Espera {st.pending_dependency_keys.join(', ')}
                        </span>
                      )}
                      {st.open_questions_count > 0 && (
                        <span className="inline-flex items-center gap-1 text-red-700 font-medium">
                          <HelpCircle className="w-3 h-3" />
                          {st.open_questions_count} preg.
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Column 3: Latest Completions */}
        <Card className="lg:col-span-4 border-slate-200 bg-white flex flex-col min-h-[260px] lg:min-h-0 overflow-hidden">
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">Últimos Cierres</h2>
              </div>
              <span className="text-[11px] text-slate-500">Recientes</span>
            </div>

            {/* Compact Latest Story & Latest Change Summary */}
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="rounded-lg bg-emerald-50/70 border border-emerald-100 px-2.5 py-1.5">
                {dashboard.last_completed_story ? (
                  <button
                    type="button"
                    onClick={() => setSelectedStoryKey(dashboard.last_completed_story!.key)}
                    className="w-full text-left flex items-center justify-between gap-2 group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-semibold uppercase text-emerald-700 shrink-0">
                        Últ. Story
                      </span>
                      <span className="font-mono text-[11px] font-bold text-emerald-800 shrink-0">
                        {dashboard.last_completed_story.key}
                      </span>
                      <span className="text-slate-800 truncate group-hover:text-indigo-700">
                        {dashboard.last_completed_story.title}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lastStoryTime?.absolute}
                    </span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Sin stories terminadas aún</span>
                )}
              </div>

              <div className="rounded-lg bg-purple-50/70 border border-purple-100 px-2.5 py-1.5">
                {dashboard.last_completed_change ? (
                  <button
                    type="button"
                    onClick={() =>
                      openChangeDrawer(
                        dashboard.last_completed_change!.key || dashboard.last_completed_change!.id,
                        'tasks',
                      )
                    }
                    className="w-full text-left flex items-center justify-between gap-2 group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-semibold uppercase text-purple-700 shrink-0">
                        Últ. Change
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-800 truncate group-hover:text-indigo-700">
                        {dashboard.last_completed_change.key ||
                          dashboard.last_completed_change.change_slug}
                      </span>
                      {renderChangePhaseBadge(dashboard.last_completed_change.phase)}
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lastChangeTime?.absolute}
                    </span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Sin changes terminados aún</span>
                )}
              </div>
            </div>

            <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setClosuresTab('STORIES')}
                className={`flex-1 px-2 py-1 rounded transition ${
                  closuresTab === 'STORIES'
                    ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Stories ({dashboard.recent_completed_stories.length})
              </button>
              <button
                type="button"
                onClick={() => setClosuresTab('CHANGES')}
                className={`flex-1 px-2 py-1 rounded transition ${
                  closuresTab === 'CHANGES'
                    ? 'bg-white text-purple-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Changes ({dashboard.recent_completed_changes.length})
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
            {closuresTab === 'STORIES' ? (
              dashboard.recent_completed_stories.length === 0 ? (
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
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                            {st.key}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {st.title}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 shrink-0">
                          {ts.absolute}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {st.tasks_completed}/{st.tasks_total} tareas · {ts.relative}
                        {st.is_estimated_time ? ' (aprox.)' : ''}
                      </div>
                    </button>
                  );
                })
              )
            ) : dashboard.recent_completed_changes.length === 0 ? (
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
                    onClick={() => openChangeDrawer(ch.key || ch.id, 'tasks')}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <GitBranch className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="font-mono text-xs font-bold text-slate-800 truncate">
                          {ch.key || ch.change_slug}
                        </span>
                        {renderChangePhaseBadge(ch.phase)}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0">
                        {ts.absolute}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="font-mono truncate">
                        {ch.repository_name || 'repositorio'}
                        {ch.story_key ? ` · ${ch.story_key}` : ''}
                      </span>
                      <span className="shrink-0">
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

      {/* Story Detail Drawer */}
      <StoryDetailSheet
        open={!!selectedStoryKey}
        onClose={() => setSelectedStoryKey(null)}
        story={(selectedStoryDetail as Story | null) || null}
      />

      {/* Change Detail & Artifact Approval Drawer */}
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
