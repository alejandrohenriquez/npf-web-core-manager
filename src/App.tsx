import React, { useState } from 'react';
import { Routes, Route, useParams, Link } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { useProjectsListQuery } from './hooks/useProjectsListQuery';
import { useStoriesBoardQuery } from './hooks/useStoriesBoardQuery';
import { useUngroupedChangesQuery } from './hooks/useUngroupedChangesQuery';
import { useQuestionsInboxQuery } from './hooks/useQuestionsInboxQuery';
import { ProjectDashboardCard } from './modules/projects/ProjectDashboardCard';
import { ProjectRepositoryMatrix } from './modules/projects/ProjectRepositoryMatrix';
import { ProjectRepositoryGraph } from './modules/projects/ProjectRepositoryGraph';
import { ProjectConstitutionView } from './modules/projects/ProjectConstitutionView';
import { BoardKanbanView } from './modules/board/BoardKanbanView';
import { BoardFilterToolbar } from './modules/board/BoardFilterToolbar';
import { UngroupedChangesTable } from './modules/changes/UngroupedChangesTable';
import { GroupIntoStoryDialog } from './modules/changes/GroupIntoStoryDialog';
import { QuestionInboxList } from './modules/questions/QuestionInboxList';
import { StoryDetailSheet } from './modules/stories/StoryDetailSheet';
import { StoryTaskReadOnlyList } from './modules/stories/StoryTaskReadOnlyList';
import { OpenSpecArtifactGraph, OpenSpecStageKey } from './modules/openspec/OpenSpecArtifactGraph';
import { OpenSpecArtifactReadOnlyViewer } from './modules/openspec/OpenSpecArtifactReadOnlyViewer';
import { Dialog } from './components/ui/dialog';
import { Sheet } from './components/ui/sheet';
import { Button } from './components/ui/button';
import { Input, Textarea } from './components/ui/input';
import { projectsService } from './services/projectsService';
import { storiesService } from './services/storiesService';
import { changesService } from './services/changesService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, HelpCircle, Layers, ArrowLeft, RefreshCw, CheckSquare, FileText } from 'lucide-react';
import { Story, Change } from './types';

// ==========================================
// 1. Dashboard View
// ==========================================
function DashboardView() {
  const { data: projects = [], isLoading } = useProjectsListQuery();
  const { data: questions = [] } = useQuestionsInboxQuery({ status: 'OPEN' });
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [wsPath, setWsPath] = useState('');
  const queryClient = useQueryClient();

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await projectsService.createProject({
      key: key.toUpperCase(),
      name,
      workspace_path: wsPath || undefined,
    });
    setIsNewProjectOpen(false);
    setKey('');
    setName('');
    setWsPath('');
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const totalOpenQuestions = questions.length;
  const activeProjectsCount = projects.filter((p) => p.status === 'ACTIVE').length;

  return (
    <div className="space-y-8">
      {/* Top Header & KPIs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard de Proyectos</h1>
          <p className="text-sm text-slate-500">
            Monitoreo y orquestación de repositorios y especificaciones OpenSpec.
          </p>
        </div>

        <Button onClick={() => setIsNewProjectOpen(true)} variant="primary" className="flex items-center space-x-1.5">
          <Plus className="w-4 h-4" />
          <span>Nuevo Proyecto</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preguntas Pendientes</div>
            <div className="text-3xl font-bold text-slate-900 mt-1">{totalOpenQuestions}</div>
          </div>
          {totalOpenQuestions > 0 ? (
            <Link to="/questions">
              <Button variant="outline" size="sm" className="text-xs text-amber-700 bg-amber-50 border-amber-200">
                Responder
              </Button>
            </Link>
          ) : (
            <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              ✓
            </div>
          )}
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proyectos Activos</div>
            <div className="text-3xl font-bold text-slate-900 mt-1">{activeProjectsCount}</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
            {projects.length}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado de Sincronización</div>
            <div className="text-sm font-medium text-emerald-600 mt-2 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Conectado al Backend</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Tus Proyectos</h2>
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Cargando proyectos...</div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            No tienes proyectos registrados aún. ¡Crea el primero!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <ProjectDashboardCard key={proj.id} project={proj} />
            ))}
          </div>
        )}
      </div>

      {/* New Project Dialog */}
      <Dialog open={isNewProjectOpen} onClose={() => setIsNewProjectOpen(false)} title="Registrar Nuevo Proyecto">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clave del Proyecto (KEY)</label>
            <Input
              placeholder="Ej: P12NT o NPF"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              maxLength={10}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Descriptivo</label>
            <Input
              placeholder="Ej: Proyecto Curricular 12NT"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ruta Local del Workspace</label>
            <Input
              placeholder="C:/Users/.../Project/proyecto-12nt"
              value={wsPath}
              onChange={(e) => setWsPath(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewProjectOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Crear Proyecto
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

// ==========================================
// 2. Global Open Questions View
// ==========================================
function QuestionsView() {
  const { data: questions = [], isLoading } = useQuestionsInboxQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bandeja Global de Preguntas Abiertas</h1>
        <p className="text-sm text-slate-500">
          Respuestas a ambigüedades arquitectónicas y funcionales formuladas por Antigravity.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Cargando preguntas abiertas...</div>
      ) : (
        <QuestionInboxList questions={questions} />
      )}
    </div>
  );
}

// ==========================================
// 3. Project Kanban Board View
// ==========================================
function BoardView() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const queryClient = useQueryClient();

  const [selectedEpic, setSelectedEpic] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isNewStoryOpen, setIsNewStoryOpen] = useState(false);

  // Form states for new story
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDesc, setStoryDesc] = useState('');
  const [storyCriteria, setStoryCriteria] = useState('');
  const [storyPriority, setStoryPriority] = useState('MEDIUM');
  const [storyEpic, setStoryEpic] = useState('');
  const [storyTargets, setStoryTargets] = useState<string[]>([]);

  const { data: project } = useQuery({
    queryKey: ['project', projectKey],
    queryFn: () => projectsService.getProject(projectKey!),
    enabled: !!projectKey,
  });

  const { data: epics = [] } = useQuery({
    queryKey: ['epics', projectKey],
    queryFn: () => projectsService.getEpics(projectKey!),
    enabled: !!projectKey,
  });

  const { data: repositories = [] } = useQuery({
    queryKey: ['repositories', projectKey],
    queryFn: () => projectsService.getRepositories(projectKey!),
    enabled: !!projectKey,
  });

  const { data: stories = [] } = useStoriesBoardQuery(projectKey!, {
    epic_ref: selectedEpic,
    repository_name: selectedRepo,
  });

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    await storiesService.createStory(projectKey!, {
      title: storyTitle,
      description: storyDesc || undefined,
      acceptance_criteria: storyCriteria || undefined,
      priority: storyPriority,
      epic_ref: storyEpic || undefined,
      target_repositories: storyTargets,
    });
    setIsNewStoryOpen(false);
    setStoryTitle('');
    setStoryDesc('');
    setStoryCriteria('');
    setStoryTargets([]);
    queryClient.invalidateQueries({ queryKey: ['stories', projectKey] });
  };

  const filteredStories = stories.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.key.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link to="/" className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {projectKey}
              </span>
              <h1 className="text-xl font-bold text-slate-900">{project?.name || projectKey}</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Tablero Kanban de Historias Transversales</p>
          </div>
        </div>

        <Link to={`/projects/${projectKey}/changes`}>
          <Button variant="outline" size="sm" className="flex items-center space-x-1.5 text-xs">
            <Layers className="w-4 h-4" />
            <span>Ver Changes Sin Agrupar & Repos</span>
          </Button>
        </Link>
      </div>

      <BoardFilterToolbar
        epics={epics}
        repositories={repositories}
        selectedEpic={selectedEpic}
        onSelectEpic={setSelectedEpic}
        selectedRepo={selectedRepo}
        onSelectRepo={setSelectedRepo}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewStoryClick={() => setIsNewStoryOpen(true)}
      />

      <BoardKanbanView
        stories={filteredStories}
        onStoryClick={(story) => setSelectedStory(story)}
      />

      {/* Story Detail Drawer */}
      <StoryDetailSheet
        open={!!selectedStory}
        onClose={() => setSelectedStory(null)}
        story={selectedStory}
      />

      {/* New Story Dialog */}
      <Dialog open={isNewStoryOpen} onClose={() => setIsNewStoryOpen(false)} title="Crear Historia de Usuario">
        <form onSubmit={handleCreateStory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Título</label>
            <Input
              placeholder="Como [rol] quiero [acción] para [beneficio]..."
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Épica (Opcional)</label>
              <select
                value={storyEpic}
                onChange={(e) => setStoryEpic(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm"
              >
                <option value="">Sin Épica</option>
                {epics.map((e) => (
                  <option key={e.id} value={e.key}>
                    {e.key}: {e.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prioridad</label>
              <select
                value={storyPriority}
                onChange={(e) => setStoryPriority(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs shadow-sm"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Repositorios Afectados</label>
            <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-md border border-slate-200 bg-slate-50">
              {repositories.map((repo) => {
                const checked = storyTargets.includes(repo.name);
                return (
                  <label key={repo.id} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) {
                          setStoryTargets(storyTargets.filter((n) => n !== repo.name));
                        } else {
                          setStoryTargets([...storyTargets, repo.name]);
                        }
                      }}
                      className="rounded text-indigo-600"
                    />
                    <span className="font-mono">{repo.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Criterios de Aceptación (Gherkin/Markdown)</label>
            <Textarea
              placeholder="Given ... When ... Then ..."
              value={storyCriteria}
              onChange={(e) => setStoryCriteria(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewStoryOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Crear Historia
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

// ==========================================
// 4. Changes & Repositories View
// ==========================================
function ChangesAndReposView() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'changes' | 'matrix' | 'graph' | 'constitution'>('changes');
  const [onlyUngrouped, setOnlyUngrouped] = useState<boolean>(false);
  const [selectedChangesForGrouping, setSelectedChangesForGrouping] = useState<string[]>([]);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [inspectedChange, setInspectedChange] = useState<Change | null>(null);
  const [inspectTab, setInspectTab] = useState<'tasks' | 'artifacts'>('tasks');
  const [selectedArtifactPath, setSelectedArtifactPath] = useState<string>('');

  const { data: changes = [] } = useQuery({
    queryKey: ['changes', projectKey, onlyUngrouped ? 'ungrouped' : 'all'],
    queryFn: () =>
      changesService.getChanges(projectKey!, onlyUngrouped ? { ungrouped: 'true' } : undefined),
    enabled: !!projectKey,
    refetchInterval: 4000,
  });

  const { data: detailedInspectedChange } = useQuery({
    queryKey: ['change_detail', inspectedChange?.id],
    queryFn: () =>
      inspectedChange ? changesService.getChange(inspectedChange.key || inspectedChange.id) : null,
    enabled: !!inspectedChange,
    refetchInterval: 4000,
  });

  const activeInspectedChange = detailedInspectedChange || inspectedChange;

  const { data: project } = useQuery({
    queryKey: ['project', projectKey],
    queryFn: () => projectsService.getProject(projectKey!),
    enabled: !!projectKey,
  });

  const { data: repositories = [] } = useQuery({
    queryKey: ['repositories', projectKey],
    queryFn: () => projectsService.getRepositories(projectKey!),
    enabled: !!projectKey,
  });

  const handleSetConstitutionRepository = async (repositoryRef: string | null) => {
    await projectsService.setConstitutionRepository(projectKey!, repositoryRef);
    queryClient.invalidateQueries({ queryKey: ['project', projectKey] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: ['project_constitution', projectKey] });
  };

  const { data: stories = [] } = useStoriesBoardQuery(projectKey!);

  const handleGroupSelected = (ids: string[]) => {
    setSelectedChangesForGrouping(ids);
    setIsGroupDialogOpen(true);
  };

  const handleAttachToExisting = async (storyRef: string) => {
    await changesService.attachChangesToStory(storyRef, selectedChangesForGrouping);
    queryClient.invalidateQueries({ queryKey: ['changes', projectKey] });
    queryClient.invalidateQueries({ queryKey: ['stories', projectKey] });
  };

  const handleCreateNewStoryWithChanges = async (title: string) => {
    const newStory = await storiesService.createStory(projectKey!, { title });
    await changesService.attachChangesToStory(newStory.key, selectedChangesForGrouping);
    queryClient.invalidateQueries({ queryKey: ['changes', projectKey] });
    queryClient.invalidateQueries({ queryKey: ['stories', projectKey] });
  };

  const handleApproveInspectedArtifact = async (artifactId: string) => {
    if (!activeInspectedChange) return;
    await changesService.approveArtifact(activeInspectedChange.key || activeInspectedChange.id, artifactId);
    queryClient.invalidateQueries({ queryKey: ['change_detail', activeInspectedChange.id] });
  };

  const handleSelectStageFromGraph = (stage: OpenSpecStageKey) => {
    const arts = activeInspectedChange?.artifacts || [];
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
    setInspectTab('artifacts');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to={`/projects/${projectKey}`} className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Catálogo de Changes & Cobertura OpenSpec</h1>
            <p className="text-xs text-slate-500">Proyecto {projectKey}</p>
          </div>
        </div>

        <div className="flex rounded-md bg-slate-100 p-0.5 text-xs font-medium">
          <button
            onClick={() => setActiveSubTab('changes')}
            className={`px-3 py-1.5 rounded transition ${
              activeSubTab === 'changes' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Catálogo de Changes ({changes.length})
          </button>
          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`px-3 py-1.5 rounded transition ${
              activeSubTab === 'matrix' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Mapa de Repositorios ({repositories.length})
          </button>
          <button
            onClick={() => setActiveSubTab('graph')}
            className={`px-3 py-1.5 rounded transition ${
              activeSubTab === 'graph' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Grafo de Datos
          </button>
          <button
            onClick={() => setActiveSubTab('constitution')}
            className={`px-3 py-1.5 rounded transition ${
              activeSubTab === 'constitution' ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-slate-600'
            }`}
          >
            Constitución
          </button>
        </div>
      </div>

      {activeSubTab === 'changes' ? (
        <UngroupedChangesTable
          changes={changes}
          onGroupSelected={handleGroupSelected}
          onInspectChange={(ch) => {
            setInspectedChange(ch);
            setInspectTab('tasks');
            setSelectedArtifactPath('');
          }}
          showGroupedToggle={true}
          onlyUngrouped={onlyUngrouped}
          onToggleOnlyUngrouped={setOnlyUngrouped}
        />
      ) : activeSubTab === 'matrix' ? (
        <ProjectRepositoryMatrix
          repositories={repositories}
          constitutionRepositoryId={project?.constitution_repository_id}
          onSetConstitutionRepository={handleSetConstitutionRepository}
        />
      ) : activeSubTab === 'graph' ? (
        <ProjectRepositoryGraph projectKey={projectKey!} repositories={repositories} />
      ) : (
        <ProjectConstitutionView
          projectKey={projectKey!}
          onGoToRepositories={() => setActiveSubTab('matrix')}
        />
      )}

      {/* Drawer to inspect any Change's Tasks & OpenSpec Artifacts */}
      <Sheet
        open={!!activeInspectedChange}
        onClose={() => setInspectedChange(null)}
        title={
          activeInspectedChange
            ? `${activeInspectedChange.key ? activeInspectedChange.key + ' — ' : ''}${activeInspectedChange.change_slug}`
            : 'Detalle del Change'
        }
      >
        {activeInspectedChange && (
          <div className="space-y-5">
            <OpenSpecArtifactGraph
              artifactStatus={activeInspectedChange.artifact_status || {}}
              skipSpecs={activeInspectedChange.skip_specs}
              onSelectStage={handleSelectStageFromGraph}
            />

            <div className="flex border-b border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setInspectTab('tasks')}
                className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
                  inspectTab === 'tasks'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  Tareas & OpenSpec ({activeInspectedChange.tasks_completed}/{activeInspectedChange.tasks_total})
                </span>
              </button>
              <button
                onClick={() => setInspectTab('artifacts')}
                className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-1.5 ${
                  inspectTab === 'artifacts'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Visor de Artefactos OpenSpec ({activeInspectedChange.artifacts?.length || 0})</span>
              </button>
            </div>

            {inspectTab === 'tasks' ? (
              <StoryTaskReadOnlyList
                tasks={activeInspectedChange.tasks || []}
                artifacts={activeInspectedChange.artifacts || []}
                change={activeInspectedChange}
                syncedAt={activeInspectedChange.synced_at}
                onOpenArtifactInTab={(relPath) => {
                  setSelectedArtifactPath(relPath);
                  setInspectTab('artifacts');
                }}
              />
            ) : (
              <OpenSpecArtifactReadOnlyViewer
                artifacts={activeInspectedChange.artifacts || []}
                onApproveArtifact={handleApproveInspectedArtifact}
                selectedPath={selectedArtifactPath}
                onSelectPathChange={setSelectedArtifactPath}
              />
            )}
          </div>
        )}
      </Sheet>

      <GroupIntoStoryDialog
        open={isGroupDialogOpen}
        onClose={() => setIsGroupDialogOpen(false)}
        selectedChangeIds={selectedChangesForGrouping}
        existingStories={stories}
        onAttachToExisting={handleAttachToExisting}
        onCreateNewStoryWithChanges={handleCreateNewStoryWithChanges}
      />
    </div>
  );
}

// ==========================================
// Main App Component with Routing
// ==========================================
export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/questions" element={<QuestionsView />} />
          <Route path="/projects/:projectKey" element={<BoardView />} />
          <Route path="/projects/:projectKey/changes" element={<ChangesAndReposView />} />
        </Routes>
      </main>
    </div>
  );
}
