import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sheet } from '../../components/ui/sheet';
import { Story } from '../../types';
import { StoryTaskReadOnlyList } from './StoryTaskReadOnlyList';
import { StoryActivityTimeline } from './StoryActivityTimeline';
import { OpenSpecArtifactGraph, OpenSpecStageKey } from '../openspec/OpenSpecArtifactGraph';
import { OpenSpecArtifactReadOnlyViewer } from '../openspec/OpenSpecArtifactReadOnlyViewer';
import { QuestionInboxList } from '../questions/QuestionInboxList';
import { storiesService } from '../../services/storiesService';
import { changesService } from '../../services/changesService';
import { questionsService } from '../../services/questionsService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '../../components/ui/badge';
import { ChevronDown, ChevronUp, FileText, CheckSquare, HelpCircle, History, Layers, Link2 } from 'lucide-react';

interface StoryDetailSheetProps {
  open: boolean;
  onClose: () => void;
  story: Story | null;
}

export const StoryDetailSheet: React.FC<StoryDetailSheetProps> = ({ open, onClose, story }) => {
  const queryClient = useQueryClient();
  const [selectedChangeId, setSelectedChangeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'questions' | 'artifacts' | 'logs'>('tasks');
  const [selectedArtifactPath, setSelectedArtifactPath] = useState<string>('');
  const [showStoryCriteria, setShowStoryCriteria] = useState<boolean>(false);

  // Reset state when switching story
  useEffect(() => {
    if (story?.changes && story.changes.length > 0) {
      setSelectedChangeId(story.changes[0].id);
    } else {
      setSelectedChangeId('');
    }
    setSelectedArtifactPath('');
  }, [story?.id]);

  // Fetch story details including fresh changes, tasks and artifacts
  const { data: freshStory } = useQuery({
    queryKey: ['story', story?.key],
    queryFn: () => (story ? storiesService.getStory(story.key) : null),
    enabled: !!story && open,
    refetchInterval: 4000,
  });

  const currentStory = freshStory || story;

  const baseChange =
    currentStory?.changes?.find((c) => c.id === selectedChangeId) ||
    currentStory?.changes?.[0];

  // Fetch detailed change (tasks + artifacts) directly from /changes/{id} to guarantee full OpenSpec data
  const { data: detailedChange } = useQuery({
    queryKey: ['change_detail', baseChange?.id],
    queryFn: () => (baseChange ? changesService.getChange(baseChange.key || baseChange.id) : null),
    enabled: !!baseChange && open,
    refetchInterval: 4000,
  });

  const currentChange = detailedChange || baseChange;

  // Fetch story questions
  const { data: storyQuestions = [] } = useQuery({
    queryKey: ['questions', 'story', currentStory?.key],
    queryFn: () => (currentStory ? questionsService.getQuestions({ story_ref: currentStory.key }) : []),
    enabled: !!currentStory && open,
    refetchInterval: 5000,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['story_logs', story?.key],
    queryFn: () => (story ? storiesService.getStoryLogs(story.key) : []),
    enabled: !!story && open,
    refetchInterval: 4000,
  });

  if (!currentStory) return null;

  const handleApproveArtifact = async (artifactId: string) => {
    if (!currentChange) return;
    await changesService.approveArtifact(currentChange.key || currentChange.id, artifactId);
    queryClient.invalidateQueries({ queryKey: ['story', currentStory.key] });
    queryClient.invalidateQueries({ queryKey: ['change_detail', currentChange.id] });
  };

  const handleAddComment = async (content: string) => {
    await storiesService.addStoryLog(currentStory.key, { content });
    queryClient.invalidateQueries({ queryKey: ['story_logs', currentStory.key] });
  };

  // Clicking on OpenSpec stage graph jumps directly to that artifact in the Artifacts tab
  const handleSelectStageFromGraph = (stage: OpenSpecStageKey) => {
    const arts = currentChange?.artifacts || [];
    let target = arts[0]?.rel_path || '';
    if (stage === 'proposal') {
      target = arts.find((a) => a.rel_path.includes('proposal.md'))?.rel_path || target;
    } else if (stage === 'specs') {
      target = arts.find((a) => a.rel_path.startsWith('specs/') || a.rel_path.includes('spec.md'))?.rel_path || target;
    } else if (stage === 'design') {
      target = arts.find((a) => a.rel_path.includes('design.md'))?.rel_path || target;
    } else if (stage === 'tasks') {
      target = arts.find((a) => a.rel_path.includes('tasks.md'))?.rel_path || target;
    }
    if (target) {
      setSelectedArtifactPath(target);
    }
    setActiveTab('artifacts');
  };

  const handleOpenArtifactFromTasks = (relPath: string) => {
    setSelectedArtifactPath(relPath);
    setActiveTab('artifacts');
  };

  const artifactsCount = currentChange?.artifacts?.length || 0;
  const tasksCompleted = currentChange?.tasks_completed ?? (currentChange?.tasks?.filter((t) => t.is_completed).length || 0);
  const tasksTotal = currentChange?.tasks_total ?? (currentChange?.tasks?.length || 0);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${currentStory.key} — ${currentStory.title}`}
    >
      <div className="space-y-5">
        {/* Story Metadata Header */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default">{currentStory.status}</Badge>
              <span className="text-xs font-semibold text-slate-600">Prioridad: {currentStory.priority}</span>
              {currentStory.epic && (
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium border border-indigo-100">
                  {currentStory.epic.key}: {currentStory.epic.title}
                </span>
              )}
              {currentStory.external_refs && currentStory.external_refs.length > 0 && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                  Ref: {currentStory.external_refs.join(', ')}
                </span>
              )}
            </div>

            {(currentStory.description || currentStory.acceptance_criteria) && (
              <button
                type="button"
                onClick={() => setShowStoryCriteria(!showStoryCriteria)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
              >
                <span>{showStoryCriteria ? 'Ocultar ficha funcional' : 'Ver descripción y criterios'}</span>
                {showStoryCriteria ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {showStoryCriteria && (
            <div className="pt-2 border-t border-slate-200 space-y-3 text-xs text-slate-700">
              {currentStory.description && (
                <div>
                  <div className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">
                    Descripción Funcional
                  </div>
                  <div className="prose prose-slate prose-xs max-w-none bg-white p-3 rounded-lg border border-slate-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentStory.description}</ReactMarkdown>
                  </div>
                </div>
              )}
              {currentStory.acceptance_criteria && (
                <div>
                  <div className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">
                    Criterios de Aceptación
                  </div>
                  <div className="prose prose-slate prose-xs max-w-none bg-white p-3 rounded-lg border border-slate-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentStory.acceptance_criteria}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStory.depends_on && currentStory.depends_on.length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dependencias ({currentStory.dependencies_total ?? currentStory.depends_on.length})</span>
                </span>
                <span className="font-mono text-[10px] text-slate-500">
                  {currentStory.pending_dependencies_count ?? 0} pendientes · {currentStory.dependencies_closed_count ?? 0} cerradas
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentStory.depends_on.map((dep) => (
                  <span
                    key={dep.id}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded border ${
                      dep.is_closed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                    title={dep.title}
                  >
                    <span className="font-bold">{dep.key}</span>
                    <span>[{dep.status}]</span>
                    <span>{dep.is_closed ? 'Cerrada' : 'Pendiente'}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Change Selector (1:N Changes per Story) */}
        {currentStory.changes && currentStory.changes.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Changes de OpenSpec ({currentStory.changes.length}):</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Total historia: {currentStory.tasks_completed}/{currentStory.tasks_total} tareas ({currentStory.progress_pct}%)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1">
              {currentStory.changes.map((ch) => {
                const isSelected = currentChange?.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChangeId(ch.id)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg font-mono transition flex items-center justify-between gap-2 border w-full ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {ch.key && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shrink-0 ${
                            isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-indigo-700'
                          }`}
                        >
                          {ch.key}
                        </span>
                      )}
                      <span className="truncate text-left" title={`${ch.repository_name}: ${ch.change_slug}`}>
                        {ch.change_slug || ch.repository_name || ch.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 tabular-nums ${
                        isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ch.phase} · {ch.tasks_completed}/{ch.tasks_total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Interactive OpenSpec Artifact Graph */}
        {currentChange && (
          <OpenSpecArtifactGraph
            artifactStatus={currentChange.artifact_status || {}}
            skipSpecs={currentChange.skip_specs}
            onSelectStage={handleSelectStageFromGraph}
          />
        )}

        {/* 4 Tabs Header */}
        <div className="flex flex-wrap border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'tasks'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Tareas & OpenSpec ({tasksCompleted}/{tasksTotal})</span>
          </button>

          <button
            onClick={() => setActiveTab('artifacts')}
            className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'artifacts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span> Visor de Artefactos OpenSpec ({artifactsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'questions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Preguntas</span>
            {currentStory.open_questions_count > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px]">
                {currentStory.open_questions_count}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
              activeTab === 'logs'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Bitácora ({logs.length})</span>
          </button>
        </div>

        {/* Tab 1: Tasks + Inline OpenSpec Text Preview */}
        {activeTab === 'tasks' && currentChange && (
          <StoryTaskReadOnlyList
            tasks={currentChange.tasks || []}
            artifacts={currentChange.artifacts || []}
            change={currentChange}
            syncedAt={currentChange.synced_at}
            onOpenArtifactInTab={handleOpenArtifactFromTasks}
          />
        )}

        {/* Tab 2: Full OpenSpec Artifacts Viewer */}
        {activeTab === 'artifacts' && currentChange && (
          <OpenSpecArtifactReadOnlyViewer
            artifacts={currentChange.artifacts || []}
            onApproveArtifact={handleApproveArtifact}
            selectedPath={selectedArtifactPath}
            onSelectPathChange={setSelectedArtifactPath}
          />
        )}

        {/* Tab 3: Questions */}
        {activeTab === 'questions' && (
          <QuestionInboxList questions={storyQuestions} />
        )}

        {/* Tab 4: Logs */}
        {activeTab === 'logs' && (
          <StoryActivityTimeline logs={logs} onAddComment={handleAddComment} />
        )}
      </div>
    </Sheet>
  );
};
