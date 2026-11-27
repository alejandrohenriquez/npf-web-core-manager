import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  GitBranch,
  HelpCircle,
  Kanban,
  Layers,
  Link2,
  Minus,
  Package,
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
  DashboardCompletedStoryItem,
  DashboardExecutionQueueItem,
  DashboardExecutionState,
  DashboardReviewItem,
  DashboardThroughputBucket,
  Story,
} from '../../types';

interface ProjectOperationsDashboardProps {
  projectKey: string;
}

type ProgressUnit = 'STORIES' | 'TASKS';
type ThroughputWindow = '24H' | '7D';
type ThroughputMetric = 'TASKS' | 'CHANGES' | 'STORIES';
type PendingGroupingMode = 'STATUS' | 'MODULE';
type ClosuresTab = 'STORIES' | 'CHANGES';
type TrayTab = 'HUMAN' | 'PIPELINE' | 'DEPENDENCIES';

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

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatBucketLabel(bucketStartIso: string, window: ThroughputWindow): string {
  const d = new Date(bucketStartIso);
  if (Number.isNaN(d.getTime())) return '';
  if (window === '24H') {
    return new Intl.DateTimeFormat('es-CL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: '2-digit',
  }).format(d);
}

type ClosureEntry<T> =
  | { kind: 'SINGLE'; item: T }
  | { kind: 'BATCH'; id: string; items: T[]; totalTasks: number; timestampIso: string };

function groupClosuresIntoBatches<T extends { id: string; finished_at: string; tasks_total: number }>(
  items: T[],
): ClosureEntry<T>[] {
  if (items.length === 0) return [];
  const entries: ClosureEntry<T>[] = [];
  let i = 0;
  while (i < items.length) {
    const anchor = items[i];
    const anchorMs = new Date(anchor.finished_at).getTime();
    let j = i + 1;
    while (j < items.length) {
      const nextMs = new Date(items[j].finished_at).getTime();
      if (Number.isNaN(anchorMs) || Number.isNaN(nextMs)) break;
      if (Math.abs(anchorMs - nextMs) <= 120_000) {
        j++;
      } else {
        break;
      }
    }
    const groupSize = j - i;
    if (groupSize >= 3) {
      const batchItems = items.slice(i, j);
      const totalTasks = batchItems.reduce((acc, it) => acc + (it.tasks_total || 0), 0);
      entries.push({
        kind: 'BATCH',
        id: `batch-${anchor.id}-${groupSize}`,
        items: batchItems,
        totalTasks,
        timestampIso: anchor.finished_at,
      });
      i = j;
    } else {
      entries.push({ kind: 'SINGLE', item: anchor });
      i += 1;
    }
  }
  return entries;
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
  if (item.kind === 'STALLED_CHANGE') {
    return { label: 'ESTANCADA', className: 'bg-red-100 text-red-800 border-red-200' };
  }
  if (item.kind === 'ANSWERED_QUESTION') {
    return { label: 'POR APLICAR', className: 'bg-blue-100 text-blue-800 border-blue-200' };
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
  const { data: dashboard, isLoading, isError } = useProjectDashboardQuery(projectKey, 30);

  const [progressUnit, setProgressUnit] = useState<ProgressUnit>('STORIES');
  const [throughputWindow, setThroughputWindow] = useState<ThroughputWindow>('24H');
  const [throughputMetric, setThroughputMetric] = useState<ThroughputMetric>('TASKS');
  const [hoveredBucketIdx, setHoveredBucketIdx] = useState<number | null>(null);

  const [trayExpanded, setTrayExpanded] = useState<boolean>(false);
  const [trayTab, setTrayTab] = useState<TrayTab>('HUMAN');

  const [pendingGrouping, setPendingGrouping] = useState<PendingGroupingMode>('STATUS');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [closuresTab, setClosuresTab] = useState<ClosuresTab>('STORIES');
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({});

  const [selectedStoryKey, setSelectedStoryKey] = useState<string | null>(null);
  const [inspectedChangeRef, setInspectedChangeRef] = useState<string | null>(null);
  const [inspectTab, setInspectTab] = useState<'tasks' | 'artifacts'>('tasks');
  const [selectedArtifactPath, setSelectedArtifactPath] = useState<string>('');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const humanTotal = dashboard?.human_attention?.total ?? 0;
  useEffect(() => {
    if (humanTotal > 0) {
      setTrayExpanded(true);
      setTrayTab('HUMAN');
    }
  }, [humanTotal]);

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

  const executionQueue = dashboard?.execution_queue || [];
  const humanItems = dashboard?.human_attention?.items || [];
  const pipelineItems = dashboard?.pipeline_pending_items || [];
  const dependencyWaits = dashboard?.dependency_waits || [];

  const liveElapsedSeconds = useMemo(() => {
    const activeCh = dashboard?.engine_health?.active_change;
    if (!activeCh || activeCh.phase !== 'APPLYING') return 0;
    const refIso = activeCh.last_progress_at || activeCh.started_at;
    if (!refIso) return activeCh.elapsed_seconds || 0;
    const refMs = new Date(refIso).getTime();
    if (Number.isNaN(refMs)) return activeCh.elapsed_seconds || 0;
    return Math.max(0, Math.floor((nowMs - refMs) / 1000));
  }, [dashboard?.engine_health?.active_change, nowMs]);

  const groupedPending = useMemo(() => {
    if (pendingGrouping === 'STATUS') {
      const buckets: Array<{ id: string; label: string; color?: string; items: DashboardExecutionQueueItem[] }> = [
        { id: 'ACTIVE', label: 'En curso / Listas', color: '#4f46e5', items: [] },
        { id: 'PLANNING', label: 'Por planificar', color: '#64748b', items: [] },
        { id: 'BLOCKED', label: 'Espera dependencia / Revisión', color: '#ea580c', items: [] },
      ];
      for (const st of executionQueue) {
        if (
          st.execution_state === 'IN_PROGRESS' ||
          st.execution_state === 'READY' ||
          st.execution_state === 'VERIFYING'
        ) {
          buckets[0].items.push(st);
        } else if (st.execution_state === 'PLANNING') {
          buckets[1].items.push(st);
        } else {
          buckets[2].items.push(st);
        }
      }
      return buckets.filter((b) => b.items.length > 0);
    }

    const byModule = new Map<
      string,
      { id: string; label: string; color?: string; items: DashboardExecutionQueueItem[] }
    >();
    for (const st of executionQueue) {
      const modKey = st.epic?.key || '__NO_EPIC__';
      const existing = byModule.get(modKey);
      if (existing) {
        existing.items.push(st);
      } else {
        byModule.set(modKey, {
          id: modKey,
          label: st.epic ? `${st.epic.key}: ${st.epic.title}` : 'Sin módulo / épica',
          color: st.epic?.color || '#94a3b8',
          items: [st],
        });
      }
    }
    return Array.from(byModule.values()).sort((a, b) => b.items.length - a.items.length);
  }, [executionQueue, pendingGrouping]);

  const storyClosureEntries = useMemo(
    () => groupClosuresIntoBatches(dashboard?.recent_completed_stories || []),
    [dashboard?.recent_completed_stories],
  );
  const changeClosureEntries = useMemo(
    () => groupClosuresIntoBatches(dashboard?.recent_completed_changes || []),
    [dashboard?.recent_completed_changes],
  );

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

  const toggleGroupCollapsed = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleBatchExpanded = (batchId: string) => {
    setExpandedBatches((prev) => ({ ...prev, [batchId]: !prev[batchId] }));
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
  const humanAttention = dashboard.human_attention || {
    total: 0,
    open_questions_count: dashboard.open_questions_count,
    pending_approvals_count: 0,
    stalled_changes_count: 0,
    items: [],
  };
  const engineHealth = dashboard.engine_health || {
    status: selectedNext ? 'ACTIVE' : 'IDLE',
    threshold_seconds: 3600,
    active_change: null,
  };
  const activeHealth = engineHealth.active_change;
  const isStalled =
    Boolean(activeHealth?.is_stalled) ||
    (activeHealth?.phase === 'APPLYING' && liveElapsedSeconds >= engineHealth.threshold_seconds);

  const progressSummary = dashboard.progress_summary || {
    stories_done: 0,
    stories_active: dashboard.in_progress_count + dashboard.in_review_count,
    stories_planning: dashboard.backlog_count,
    stories_blocked_dep: 0,
    stories_blocked_human: 0,
    stories_total: executionQueue.length,
    tasks_completed: 0,
    tasks_total: 0,
    unestimated_stories_count: 0,
  };

  const throughput = dashboard.throughput;
  const activeBuckets: DashboardThroughputBucket[] =
    throughputWindow === '24H' ? throughput?.window_24h || [] : throughput?.window_7d || [];
  const getBucketValue = (b: DashboardThroughputBucket) => {
    if (throughputMetric === 'TASKS') return b.tasks_completed;
    if (throughputMetric === 'CHANGES') return b.changes_completed;
    return b.stories_completed;
  };
  const maxBucketValue = Math.max(1, ...activeBuckets.map(getBucketValue));

  // Progress bar segments
  const storiesTotal = Math.max(1, progressSummary.stories_total);
  const donePct =
    progressUnit === 'STORIES'
      ? (progressSummary.stories_done / storiesTotal) * 100
      : progressSummary.tasks_total > 0
        ? (progressSummary.tasks_completed / progressSummary.tasks_total) * 100
        : 0;
  const activePct =
    progressUnit === 'STORIES' ? (progressSummary.stories_active / storiesTotal) * 100 : 0;
  const planningPct =
    progressUnit === 'STORIES' ? (progressSummary.stories_planning / storiesTotal) * 100 : 0;
  const blockedTotal = progressSummary.stories_blocked_dep + progressSummary.stories_blocked_human;
  const blockedPct = progressUnit === 'STORIES' ? (blockedTotal / storiesTotal) * 100 : 0;

  const activeQueueCount = executionQueue.filter(
    (s) =>
      s.execution_state === 'IN_PROGRESS' ||
      s.execution_state === 'READY' ||
      s.execution_state === 'VERIFYING',
  ).length;
  const planningQueueCount = executionQueue.filter(
    (s) => s.execution_state === 'PLANNING',
  ).length;
  const depQueueCount = executionQueue.filter(
    (s) => s.execution_state === 'BLOCKED_DEPENDENCY',
  ).length;

  const activeTrayItems =
    trayTab === 'HUMAN' ? humanItems : trayTab === 'PIPELINE' ? pipelineItems : dependencyWaits;

  const renderReviewRow = (item: DashboardReviewItem) => {
    const badgeMeta = getReviewBadgeMeta(item);
    const rowTargetChange = item.change_key || item.change_id;

    if (item.kind === 'BLOCKING_QUESTION') {
      return (
        <Link
          key={item.id}
          to={`/questions?project=${dashboard.project_key}`}
          className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-red-50/40 transition"
        >
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Badge
                variant="secondary"
                className={`text-[10px] font-semibold px-1.5 py-0 ${badgeMeta.className}`}
              >
                {badgeMeta.label}
              </Badge>
              {(item.change_key || item.story_key) && (
                <span className="font-mono text-[11px] font-bold text-slate-700">
                  {item.change_key || item.story_key}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-900 truncate">{item.title}</p>
            {item.detail && <p className="text-[11px] text-slate-500 truncate">{item.detail}</p>}
          </div>
          <span className="text-[11px] font-semibold text-red-700 inline-flex items-center gap-0.5 shrink-0">
            Responder <ArrowRight className="w-3 h-3" />
          </span>
        </Link>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          if (item.kind === 'ARTIFACT_APPROVAL' && rowTargetChange) {
            openChangeDrawer(rowTargetChange, 'artifacts', item.artifact_rel_path || '');
          } else if (rowTargetChange && item.kind !== 'PENDING_DEPENDENCY') {
            openChangeDrawer(rowTargetChange, 'tasks');
          } else if (item.story_key) {
            setSelectedStoryKey(item.story_key);
          }
        }}
        className="w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition"
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className={`text-[10px] font-semibold px-1.5 py-0 ${badgeMeta.className}`}
            >
              {badgeMeta.label}
            </Badge>
            {item.change_key && (
              <span className="font-mono text-[11px] font-bold text-slate-800">
                {item.change_key}
              </span>
            )}
            {item.repository_name && (
              <span className="font-mono text-[10px] text-slate-500 truncate">
                · {item.repository_name}
              </span>
            )}
          </div>
          <p className="text-xs font-medium text-slate-900 truncate">{item.title}</p>
          {item.detail && <p className="text-[11px] text-slate-500 truncate">{item.detail}</p>}
        </div>
        <span className="text-[11px] font-semibold text-indigo-700 inline-flex items-center gap-0.5 shrink-0">
          {item.kind === 'ARTIFACT_APPROVAL' ? 'Revisar' : 'Ver'} <ArrowRight className="w-3 h-3" />
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Clean Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
        <div className="flex items-center space-x-3 min-w-0">
          <Link to="/" className="p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center flex-wrap gap-2 min-w-0">
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

        <div className="flex items-center flex-wrap gap-2">
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

      {/* ZONA 1: Franja Superior — Semáforo de Estado y Bloqueos Reales (4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* KPI 1: Atención Humana */}
        <Card
          className={`p-4 border shadow-sm transition ${
            humanAttention.total === 0
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-red-50/70 border-red-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                Atención Humana
              </div>
              <div
                className={`text-2xl font-bold mt-1 tabular-nums ${
                  humanAttention.total === 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {humanAttention.total}
              </div>
            </div>
            {humanAttention.total === 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Pipeline autónomo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
                <ShieldAlert className="w-3.5 h-3.5" />
                Requiere acción
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
            <span>
              {humanAttention.open_questions_count} preg. · {humanAttention.pending_approvals_count}{' '}
              aprob. · {humanAttention.stalled_changes_count} estanc.
            </span>
            {humanAttention.open_questions_count > 0 ? (
              <Link
                to={`/questions?project=${dashboard.project_key}`}
                className="font-semibold text-red-700 hover:underline inline-flex items-center gap-0.5"
              >
                Preguntas <ArrowRight className="w-3 h-3" />
              </Link>
            ) : humanAttention.total > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setTrayExpanded(true);
                  setTrayTab('HUMAN');
                }}
                className="font-semibold text-red-700 hover:underline"
              >
                Ver bandeja
              </button>
            ) : null}
          </div>
        </Card>

        {/* KPI 2: Estado del Motor */}
        <Card
          className={`p-4 border shadow-sm ${
            isStalled
              ? 'bg-amber-50/70 border-amber-300'
              : engineHealth.status === 'ACTIVE'
                ? 'bg-white border-indigo-200'
                : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Estado del Motor
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-xl font-bold ${
                    isStalled
                      ? 'text-amber-800'
                      : engineHealth.status === 'ACTIVE'
                        ? 'text-indigo-700'
                        : engineHealth.status === 'BLOCKED'
                          ? 'text-red-700'
                          : 'text-slate-700'
                  }`}
                >
                  {isStalled
                    ? 'ESTANCADO'
                    : engineHealth.status === 'ACTIVE'
                      ? 'ACTIVO'
                      : engineHealth.status === 'BLOCKED'
                        ? 'BLOQUEADO'
                        : 'DETENIDO'}
                </span>
              </div>
            </div>
            <div
              className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                isStalled
                  ? 'bg-amber-100 text-amber-700'
                  : engineHealth.status === 'ACTIVE'
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
            {activeHealth ? (
              <>
                <span className="font-mono truncate">
                  {activeHealth.change_key || activeHealth.change_slug}
                </span>
                <span
                  className={`font-mono font-semibold flex items-center gap-1 shrink-0 ${
                    isStalled ? 'text-amber-800' : 'text-slate-700'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {activeHealth.phase === 'APPLYING'
                    ? formatDuration(liveElapsedSeconds)
                    : 'Listo p/ iniciar'}
                </span>
              </>
            ) : (
              <span className="text-slate-400">Sin change en ejecución</span>
            )}
          </div>
        </Card>

        {/* KPI 3: Pendientes (Backlog) */}
        <Card className="p-4 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Pendientes (Cola)
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {executionQueue.length}{' '}
                <span className="text-xs font-medium text-slate-500">stories</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 truncate">
            {activeQueueCount} en curso · {planningQueueCount} por planificar · {depQueueCount} por
            dep.
          </div>
        </Card>

        {/* KPI 4: Velocidad (24h / 7d) */}
        <Card className="p-4 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Velocidad (24h)
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">
                  {throughput?.tasks_completed_24h ?? 0}
                </span>
                <span className="text-xs font-medium text-slate-500">tareas / 24h</span>
              </div>
            </div>
            {throughput && (
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  throughput.trend_direction === 'UP'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : throughput.trend_direction === 'DOWN'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {throughput.trend_direction === 'UP' && <ArrowUpRight className="w-3 h-3" />}
                {throughput.trend_direction === 'DOWN' && <ArrowDownRight className="w-3 h-3" />}
                {throughput.trend_direction === 'FLAT' && <Minus className="w-3 h-3" />}
                {throughput.trend_pct > 0 ? `+${throughput.trend_pct}%` : `${throughput.trend_pct}%`}
              </span>
            )}
          </div>
          <div className="mt-2 text-[11px] text-slate-600 tabular-nums">
            Prom: {throughput?.tasks_per_hour_24h ?? 0} t/h · {throughput?.tasks_per_day_7d ?? 0}{' '}
            t/día (7d)
          </div>
        </Card>
      </div>

      {/* ZONA 2: Bloque Central — Progreso Global + Pulso de Velocidad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Panel A: Progreso del Proyecto */}
        <Card className="lg:col-span-5 p-4 border border-slate-200 bg-white shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Progreso del Proyecto</h2>
              <p className="text-[11px] text-slate-500">
                {progressUnit === 'STORIES'
                  ? `${progressSummary.stories_done} de ${progressSummary.stories_total} stories completadas`
                  : `${progressSummary.tasks_completed} de ${progressSummary.tasks_total} tareas desglosadas`}
              </p>
            </div>
            <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setProgressUnit('STORIES')}
                className={`px-2 py-1 rounded transition ${
                  progressUnit === 'STORIES'
                    ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Stories
              </button>
              <button
                type="button"
                onClick={() => setProgressUnit('TASKS')}
                className={`px-2 py-1 rounded transition ${
                  progressUnit === 'TASKS'
                    ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tareas
              </button>
            </div>
          </div>

          {/* Segmented Bar */}
          <div className="space-y-2">
            <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
              {donePct > 0 && (
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${donePct}%` }}
                  title={`Completado: ${donePct.toFixed(1)}%`}
                />
              )}
              {activePct > 0 && (
                <div
                  className="bg-indigo-500 h-full transition-all"
                  style={{ width: `${activePct}%` }}
                  title={`En ejecución: ${activePct.toFixed(1)}%`}
                />
              )}
              {planningPct > 0 && (
                <div
                  className="bg-slate-300 h-full transition-all"
                  style={{ width: `${planningPct}%` }}
                  title={`Por planificar: ${planningPct.toFixed(1)}%`}
                />
              )}
              {blockedPct > 0 && (
                <div
                  className="bg-amber-400 h-full transition-all"
                  style={{ width: `${blockedPct}%` }}
                  title={`Bloqueado: ${blockedPct.toFixed(1)}%`}
                />
              )}
            </div>

            {progressUnit === 'STORIES' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
                  <span className="text-slate-600">
                    Done: <strong className="text-slate-900">{progressSummary.stories_done}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shrink-0" />
                  <span className="text-slate-600">
                    Ejecución:{' '}
                    <strong className="text-slate-900">{progressSummary.stories_active}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 shrink-0" />
                  <span className="text-slate-600">
                    Planning:{' '}
                    <strong className="text-slate-900">{progressSummary.stories_planning}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shrink-0" />
                  <span className="text-slate-600">
                    Bloqueadas: <strong className="text-slate-900">{blockedTotal}</strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                <span>
                  Avance global sobre tareas conocidas:{' '}
                  <strong className="text-slate-900">{donePct.toFixed(1)}%</strong>
                </span>
                <span className="font-mono">
                  {progressSummary.tasks_completed}/{progressSummary.tasks_total}
                </span>
              </div>
            )}
          </div>

          {progressSummary.unestimated_stories_count > 0 && (
            <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-md px-2.5 py-1.5">
              ETA parcial: <strong>{progressSummary.unestimated_stories_count}</strong> stories en
              PLANNING aún sin tareas desglosadas.
            </div>
          )}
        </Card>

        {/* Panel B: Pulso de Velocidad (Throughput) */}
        <Card className="lg:col-span-7 p-4 border border-slate-200 bg-white shadow-sm flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Pulso de Velocidad</h2>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px] font-medium">
                {(['TASKS', 'CHANGES', 'STORIES'] as ThroughputMetric[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setThroughputMetric(m)}
                    className={`px-2 py-0.5 rounded transition ${
                      throughputMetric === m
                        ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m === 'TASKS' ? 'Tareas' : m === 'CHANGES' ? 'Changes' : 'Stories'}
                  </button>
                ))}
              </div>
              <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px] font-medium">
                {(['24H', '7D'] as ThroughputWindow[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setThroughputWindow(w);
                      setHoveredBucketIdx(null);
                    }}
                    className={`px-2 py-0.5 rounded transition ${
                      throughputWindow === w
                        ? 'bg-white text-slate-900 shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {w === '24H' ? '24h' : '7d'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Native SVG Bar Chart */}
          <div className="relative h-28 w-full">
            {activeBuckets.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Sin datos de velocidad aún.
              </div>
            ) : (
              <>
                <svg
                  viewBox={`0 0 ${activeBuckets.length * 24} 88`}
                  className="w-full h-24 overflow-visible"
                  preserveAspectRatio="none"
                >
                  <line x1="0" y1="76" x2={activeBuckets.length * 24} y2="76" stroke="#e2e8f0" strokeWidth="1" />
                  {activeBuckets.map((b, idx) => {
                    const val = getBucketValue(b);
                    const barHeight = val > 0 ? Math.max(4, (val / maxBucketValue) * 68) : 2;
                    const x = idx * 24 + 4;
                    const y = 76 - barHeight;
                    const isHovered = hoveredBucketIdx === idx;
                    return (
                      <g
                        key={b.bucket_start}
                        onMouseEnter={() => setHoveredBucketIdx(idx)}
                        onMouseLeave={() => setHoveredBucketIdx(null)}
                        className="cursor-pointer"
                      >
                        <rect x={idx * 24} y={0} width={24} height={88} fill="transparent" />
                        <rect
                          x={x}
                          y={y}
                          width={16}
                          height={barHeight}
                          rx={3}
                          fill={
                            val === 0
                              ? '#e2e8f0'
                              : isHovered
                                ? '#4338ca'
                                : throughputMetric === 'TASKS'
                                  ? '#6366f1'
                                  : throughputMetric === 'CHANGES'
                                    ? '#9333ea'
                                    : '#10b981'
                          }
                        />
                      </g>
                    );
                  })}
                </svg>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 px-1">
                  <span>{formatBucketLabel(activeBuckets[0].bucket_start, throughputWindow)}</span>
                  {activeBuckets.length > 2 && (
                    <span>
                      {formatBucketLabel(
                        activeBuckets[Math.floor(activeBuckets.length / 2)].bucket_start,
                        throughputWindow,
                      )}
                    </span>
                  )}
                  <span>
                    {formatBucketLabel(
                      activeBuckets[activeBuckets.length - 1].bucket_start,
                      throughputWindow,
                    )}
                  </span>
                </div>
                {hoveredBucketIdx !== null && activeBuckets[hoveredBucketIdx] && (
                  <div className="absolute top-0 right-1 px-2 py-1 rounded bg-slate-900 text-white text-[11px] font-mono shadow-sm pointer-events-none">
                    {formatBucketLabel(activeBuckets[hoveredBucketIdx].bucket_start, throughputWindow)}
                    : {getBucketValue(activeBuckets[hoveredBucketIdx])}{' '}
                    {throughputMetric === 'TASKS'
                      ? 'tareas'
                      : throughputMetric === 'CHANGES'
                        ? 'changes'
                        : 'stories'}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 border-t border-slate-100 pt-2">
            <span>
              Promedio: <strong>{throughput?.tasks_per_hour_24h ?? 0}</strong> tareas/h ·{' '}
              <strong>{throughput?.changes_completed_24h ?? 0}</strong> changes/24h
            </span>
            <span>
              Ciclo medio por change:{' '}
              <strong>
                {throughput?.avg_change_cycle_minutes != null
                  ? `${throughput.avg_change_cycle_minutes} min`
                  : '—'}
              </strong>
            </span>
          </div>
        </Card>
      </div>

      {/* ZONA 3: Foco Activo (#1) + Bandeja de Bloqueos Colapsable */}
      <div className="space-y-2.5">
        {selectedNext ? (
          <div
            className={`rounded-xl border px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-4 ${
              isStalled
                ? 'border-amber-300 bg-gradient-to-r from-amber-50 via-white to-amber-50/40'
                : 'border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-emerald-50/60'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`h-9 w-9 rounded-lg text-white flex items-center justify-center shrink-0 shadow-sm ${
                  isStalled ? 'bg-amber-600' : 'bg-indigo-600'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  <span
                    className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded text-white ${
                      isStalled ? 'bg-amber-600' : 'bg-indigo-600'
                    }`}
                  >
                    Foco Activo (#1)
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
                  {selectedNext.phase === 'APPLYING' && (
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-full border ${
                        isStalled
                          ? 'bg-red-100 text-red-800 border-red-200 font-semibold'
                          : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {formatDuration(liveElapsedSeconds)}
                      {isStalled ? ' · Estancada (>1h)' : ''}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-900 truncate mt-1">
                  {selectedNext.next_task.task_code ? (
                    <span className="font-mono text-indigo-700 mr-1.5">
                      {selectedNext.next_task.task_code}
                    </span>
                  ) : null}
                  {selectedNext.next_task.title || selectedNext.next_task.description}
                </p>
              </div>
            </div>

            {/* Dual Progress Bars + Actions */}
            <div className="flex items-center flex-wrap gap-4 shrink-0">
              <div className="flex flex-col gap-1.5 min-w-[170px]">
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px] font-mono text-slate-600">
                    <span>Change</span>
                    <span>
                      {selectedNext.tasks_completed}/{selectedNext.tasks_total}
                    </span>
                  </div>
                  <div className="w-44 bg-slate-200 rounded-full h-1.5 overflow-hidden">
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

                {activeHealth && activeHealth.story_tasks_total > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex justify-between text-[10px] font-mono text-slate-600">
                      <span>Story {activeHealth.story_key}</span>
                      <span>
                        {activeHealth.story_tasks_completed}/{activeHealth.story_tasks_total} (
                        {activeHealth.story_progress_pct}%)
                      </span>
                    </div>
                    <div className="w-44 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${activeHealth.story_progress_pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
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
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
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
                          {exclusions.blocked_questions} pregunta(s)
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

        {/* Bandeja de Bloqueos Colapsable */}
        <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
            <button
              type="button"
              onClick={() => setTrayExpanded((prev) => !prev)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-800 hover:text-indigo-700 transition"
            >
              {trayExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
              {humanAttention.total === 0 ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />0 bloqueos humanos
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-red-700">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {humanAttention.total} bloqueo(s) de atención humana
                </span>
              )}
              <span className="text-slate-400 font-normal">
                · {pipelineItems.length} en pipeline · {dependencyWaits.length} por dependencia
              </span>
            </button>

            {trayExpanded && (
              <div className="flex rounded-md bg-slate-200/70 p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setTrayTab('HUMAN')}
                  className={`px-2 py-0.5 rounded transition ${
                    trayTab === 'HUMAN'
                      ? 'bg-white text-red-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Atención Humana ({humanItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTrayTab('PIPELINE')}
                  className={`px-2 py-0.5 rounded transition ${
                    trayTab === 'PIPELINE'
                      ? 'bg-white text-purple-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pipeline ({pipelineItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTrayTab('DEPENDENCIES')}
                  className={`px-2 py-0.5 rounded transition ${
                    trayTab === 'DEPENDENCIES'
                      ? 'bg-white text-orange-700 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dependencias ({dependencyWaits.length})
                </button>
              </div>
            )}
          </div>

          {trayExpanded && (
            <div className="border-t border-slate-100 max-h-64 overflow-y-auto divide-y divide-slate-100">
              {activeTrayItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Sin elementos en esta bandeja.
                </div>
              ) : (
                activeTrayItems.map(renderReviewRow)
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ZONA 4: Dos Columnas Inferiores */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Columna Izquierda: Pendientes Agrupados */}
        <Card className="lg:col-span-6 border-slate-200 bg-white flex flex-col overflow-hidden shadow-sm">
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Play className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Pendientes Agrupados ({executionQueue.length})
              </h2>
            </div>

            <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setPendingGrouping('STATUS')}
                className={`px-2.5 py-1 rounded transition ${
                  pendingGrouping === 'STATUS'
                    ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Estado
              </button>
              <button
                type="button"
                onClick={() => setPendingGrouping('MODULE')}
                className={`px-2.5 py-1 rounded transition ${
                  pendingGrouping === 'MODULE'
                    ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Módulo
              </button>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
            {groupedPending.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No hay historias activas en cola.
              </div>
            ) : (
              groupedPending.map((group) => {
                const isCollapsed = Boolean(collapsedGroups[group.id]);
                return (
                  <div key={group.id}>
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapsed(group.id)}
                      className="w-full px-4 py-2 bg-slate-50/80 hover:bg-slate-100/80 transition flex items-center justify-between text-xs font-semibold text-slate-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        {group.color && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: group.color }}
                          />
                        )}
                        <span className="truncate">{group.label}</span>
                      </div>
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 shrink-0">
                        {group.items.length}
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100">
                        {group.items.map((st) => {
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

                              <p className="text-xs font-medium text-slate-900 truncate">
                                {st.title}
                              </p>

                              <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-500">
                                <span className="font-mono">
                                  {st.changes_count} {st.changes_count === 1 ? 'change' : 'changes'}
                                </span>
                                {st.epic && pendingGrouping === 'STATUS' && (
                                  <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
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
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Columna Derecha: Actividad y Cierres Recientes */}
        <Card className="lg:col-span-6 border-slate-200 bg-white flex flex-col overflow-hidden shadow-sm">
          <div className="shrink-0 px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Actividad y Cierres Recientes</h2>
            </div>

            <div className="flex rounded-md bg-slate-100 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setClosuresTab('STORIES')}
                className={`px-2.5 py-1 rounded transition ${
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
                className={`px-2.5 py-1 rounded transition ${
                  closuresTab === 'CHANGES'
                    ? 'bg-white text-purple-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Changes ({dashboard.recent_completed_changes.length})
              </button>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
            {closuresTab === 'STORIES' ? (
              storyClosureEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No hay stories completadas aún.
                </div>
              ) : (
                storyClosureEntries.map((entry) => {
                  if (entry.kind === 'BATCH') {
                    const ts = formatFinishTimestamp(entry.timestampIso);
                    const isOpen = Boolean(expandedBatches[entry.id]);
                    return (
                      <div key={entry.id} className="bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleBatchExpanded(entry.id)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-100/70 transition flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-semibold text-slate-800">
                              Lote de {entry.items.length} cierres
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                              {entry.totalTasks} tareas
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 shrink-0">
                            <span>{ts.absolute}</span>
                            {isOpen ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white pl-4">
                            {entry.items.map((st: DashboardCompletedStoryItem) => {
                              const itemTs = formatFinishTimestamp(st.finished_at);
                              return (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => setSelectedStoryKey(st.key)}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-50 transition flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono text-[11px] font-bold text-emerald-700">
                                      {st.key}
                                    </span>
                                    <span className="text-xs text-slate-800 truncate">
                                      {st.title}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                    {st.tasks_total} tareas · {itemTs.absolute}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const st = entry.item;
                  const ts = formatFinishTimestamp(st.finished_at);
                  const isHeavy = st.tasks_total >= 50;
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
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              isHeavy
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {st.tasks_total} tareas
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {ts.absolute}
                          </span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {st.tasks_completed}/{st.tasks_total} completadas · {ts.relative}
                        {st.is_estimated_time ? ' (aprox.)' : ''}
                      </div>
                    </button>
                  );
                })
              )
            ) : changeClosureEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No hay changes terminados aún.
              </div>
            ) : (
              changeClosureEntries.map((entry) => {
                if (entry.kind === 'BATCH') {
                  const ts = formatFinishTimestamp(entry.timestampIso);
                  const isOpen = Boolean(expandedBatches[entry.id]);
                  return (
                    <div key={entry.id} className="bg-slate-50/50">
                      <button
                        type="button"
                        onClick={() => toggleBatchExpanded(entry.id)}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-100/70 transition flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="text-xs font-semibold text-slate-800">
                            Lote de {entry.items.length} changes
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                            {entry.totalTasks} tareas
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 shrink-0">
                          <span>{ts.absolute}</span>
                          {isOpen ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white pl-4">
                          {entry.items.map((ch: DashboardCompletedChangeItem) => {
                            const itemTs = formatFinishTimestamp(ch.finished_at);
                            return (
                              <button
                                key={ch.id}
                                type="button"
                                onClick={() => openChangeDrawer(ch.key || ch.id, 'tasks')}
                                className="w-full text-left px-4 py-2 hover:bg-slate-50 transition flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-xs font-bold text-slate-800 truncate">
                                    {ch.key || ch.change_slug}
                                  </span>
                                  {renderChangePhaseBadge(ch.phase)}
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 shrink-0">
                                  {ch.tasks_total} tareas · {itemTs.absolute}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const ch = entry.item;
                const ts = formatFinishTimestamp(ch.finished_at);
                const isHeavy = ch.tasks_total >= 50;
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
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            isHeavy
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {ch.tasks_total} tareas
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">{ts.absolute}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span className="font-mono truncate">
                        {ch.repository_name || 'repositorio'}
                        {ch.story_key ? ` · ${ch.story_key}` : ''}
                      </span>
                      <span className="shrink-0">
                        {ch.tasks_completed}/{ch.tasks_total} completadas · {ts.relative}
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
