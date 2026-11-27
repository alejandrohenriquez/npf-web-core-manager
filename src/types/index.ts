export interface Project {
  id: string;
  key: string;
  name: string;
  description?: string;
  workspace_path?: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  story_sequence: number;
  epic_sequence: number;
  progress_pct: number | null;
  ungrouped_changes_count: number;
  open_questions_count: number;
  constitution_repository_id?: string | null;
  constitution_repository_name?: string | null;
  has_constitution?: boolean;
  constitution_sha256?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectConstitutionResponse {
  project_key: string;
  has_constitution: boolean;
  repository_id?: string | null;
  repository_name?: string | null;
  rel_path?: string | null;
  source_sha256?: string | null;
  synced_at?: string | null;
  sections: string[];
  content?: string | null;
}

export interface ProjectRepository {
  id: string;
  project_id: string;
  name: string;
  repo_type: 'SERVICE' | 'BFF' | 'LIB' | 'WEB' | 'DOC' | 'INFRA' | 'MCP' | 'TEMPLATE' | 'OTHER';
  repo_path?: string;
  specs_count: number;
  specs_inventory: string[];
  created_at: string;
  updated_at?: string;
}

export interface Epic {
  id: string;
  project_id: string;
  epic_number: number;
  key: string;
  title: string;
  description?: string;
  color: string;
  status: 'OPEN' | 'DONE' | 'ARCHIVED';
  stories_count?: number;
  stories_done_count?: number;
}

export interface TaskItem {
  id: string;
  change_id: string;
  task_code?: string;
  section?: string;
  title: string;
  description?: string;
  is_completed: boolean;
  position: number;
  synced_at: string;
}

export interface ChangeArtifact {
  id: string;
  change_id: string;
  artifact_id: string;
  rel_path: string;
  content: string;
  source_sha256: string;
  review_status: 'UNREVIEWED' | 'APPROVED' | 'NEEDS_CHANGES';
  approved_sha256?: string;
  is_approval_stale?: boolean;
  synced_at: string;
}

export interface Change {
  id: string;
  project_id: string;
  story_id?: string;
  repository_id: string;
  repository_name?: string;
  repo_type?: string;
  key?: string;
  change_number?: number;
  name: string;
  change_slug: string;
  archived_folder?: string;
  phase: 'PENDING' | 'PLANNING' | 'READY' | 'BLOCKED' | 'APPLYING' | 'VERIFYING' | 'ARCHIVED' | 'CANCELLED';
  sync_state: 'NOT_CREATED' | 'SYNCED' | 'MISSING';
  origin: 'NATIVE' | 'IMPORTED_ACTIVE' | 'IMPORTED_ARCHIVE';
  is_planning_complete: boolean;
  skip_specs: boolean;
  artifact_status: Record<string, string>;
  tasks_total: number;
  tasks_completed: number;
  open_questions_count: number;
  synced_at?: string;
  completed_at?: string | null;
  artifacts?: ChangeArtifact[];
  tasks?: TaskItem[];
}

export interface StoryDependencyItem {
  id: string;
  key: string;
  title: string;
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  is_closed: boolean;
  is_pending: boolean;
}

export interface Story {
  id: string;
  project_id: string;
  key: string;
  story_number: number;
  change_sequence: number;
  title: string;
  description?: string;
  acceptance_criteria?: string;
  external_refs: string[];
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  position: number;
  epic?: Epic;
  tasks_total: number;
  tasks_completed: number;
  progress_pct: number;
  task_progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
  open_questions_count: number;
  depends_on?: StoryDependencyItem[];
  depends_on_keys?: string[];
  dependencies_total?: number;
  dependencies_closed_count?: number;
  pending_dependencies_count?: number;
  pending_dependency_keys?: string[];
  closed_dependency_keys?: string[];
  changes: Change[];
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  label?: string;
  text?: string;
  description?: string;
  is_recommended?: boolean;
}

export interface OpenQuestion {
  id: string;
  project_id?: string;
  story_id?: string;
  change_id?: string;
  phase: 'DISCOVERY' | 'PROPOSAL' | 'SPECS' | 'DESIGN' | 'TASKS' | 'APPLY';
  question_type: 'SINGLE_SELECT' | 'MULTI_SELECT' | 'FREE_TEXT';
  question_text: string;
  question?: string;
  context?: string;
  is_blocking: boolean;
  options: QuestionOption[];
  selected_options?: any[];
  answer_text?: string;
  status: 'OPEN' | 'ANSWERED' | 'APPLIED' | 'DISMISSED';
  asked_by: 'ANTIGRAVITY' | 'USER';
  created_at: string;
  answered_at?: string;
}

export interface StoryLog {
  id: string;
  story_id: string;
  change_id?: string;
  author_type: 'USER' | 'ANTIGRAVITY' | 'SYSTEM';
  log_type: 'COMMENT' | 'PROGRESS' | 'STATUS_CHANGE' | 'QUESTION_ANSWERED' | 'BLOCKER';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}


export interface RepositoryServiceAlias {
  id: string;
  project_id: string;
  service_key: string;
  target_repository_id: string;
  target_repository_name: string;
  created_at: string;
  updated_at: string;
}

export interface RepositoryGraphNode {
  id: string;
  name: string;
  repo_type: string;
  specs_count: number;
  specs_inventory: string[];
  is_unresolved: boolean;
}

export interface RepositoryGraphEdgeDetail {
  service_key: string;
  endpoints_count: number;
  resolution_method: string;
  source_file?: string;
}

export interface RepositoryGraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  endpoints_count: number;
  service_keys: string[];
  resolution_methods: string[];
  details: RepositoryGraphEdgeDetail[];
}

export interface RepositoryGraphResponse {
  project_key: string;
  nodes: RepositoryGraphNode[];
  edges: RepositoryGraphEdge[];
  aliases: RepositoryServiceAlias[];
}

export interface DashboardPendingStoryItem {
  id: string;
  key: string;
  title: string;
  status: 'BACKLOG' | 'TODO';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  epic?: Epic;
  changes_count: number;
  tasks_total: number;
  tasks_completed: number;
  progress_pct: number;
  open_questions_count: number;
  pending_dependencies_count: number;
  updated_at: string;
}

export interface DashboardCompletedStoryItem {
  id: string;
  key: string;
  title: string;
  status: 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  epic?: Epic;
  tasks_total: number;
  tasks_completed: number;
  completed_at?: string | null;
  finished_at: string;
  is_estimated_time: boolean;
}

export interface DashboardCompletedChangeItem {
  id: string;
  key?: string | null;
  change_slug: string;
  phase: 'ARCHIVED' | 'VERIFYING';
  repository_name?: string | null;
  repo_type?: string | null;
  story_id?: string | null;
  story_key?: string | null;
  story_title?: string | null;
  tasks_total: number;
  tasks_completed: number;
  completed_at?: string | null;
  finished_at: string;
  is_estimated_time: boolean;
}

export interface NextWorkExclusionSummary {
  blocked_questions: number;
  pending_dependencies: number;
  unapproved_or_stale: number;
  planning_or_pending: number;
  verifying_ready_to_archive: number;
  empty_tasks: number;
}

export interface NextWorkCandidate {
  story_id?: string | null;
  story_key?: string | null;
  story_title?: string | null;
  story_priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  change_id: string;
  change_key?: string | null;
  change_slug: string;
  repository_name?: string | null;
  phase: string;
  tasks_completed: number;
  tasks_total: number;
  next_task: TaskItem;
  artifact_paths: string[];
}

export interface NextWorkResponse {
  project_key: string;
  eligible: boolean;
  require_approval: boolean;
  selection_reason?: string | null;
  message: string;
  selected: NextWorkCandidate | null;
  exclusions: NextWorkExclusionSummary;
  has_constitution: boolean;
  constitution_repository_name?: string | null;
  constitution_sha256?: string | null;
}

export type DashboardReviewItemKind =
  | 'BLOCKING_QUESTION'
  | 'ARTIFACT_APPROVAL'
  | 'STALLED_CHANGE'
  | 'VERIFYING_ARCHIVE'
  | 'ANSWERED_QUESTION'
  | 'PENDING_DEPENDENCY'
  | 'PLANNING_INCOMPLETE';

export interface DashboardReviewItem {
  id: string;
  kind: DashboardReviewItemKind;
  severity: 'HIGH' | 'MEDIUM';
  title: string;
  detail?: string | null;
  story_id?: string | null;
  story_key?: string | null;
  story_title?: string | null;
  change_id?: string | null;
  change_key?: string | null;
  change_slug?: string | null;
  change_phase?: string | null;
  repository_name?: string | null;
  artifact_id?: string | null;
  artifact_rel_path?: string | null;
  artifact_review_state?: 'UNREVIEWED' | 'STALE' | 'NEEDS_CHANGES' | null;
  question_id?: string | null;
  pending_dependency_keys: string[];
  created_at?: string | null;
}

export type DashboardExecutionState =
  | 'IN_PROGRESS'
  | 'READY'
  | 'NEEDS_APPROVAL'
  | 'BLOCKED_QUESTION'
  | 'VERIFYING'
  | 'PLANNING'
  | 'BLOCKED_DEPENDENCY';

export interface DashboardExecutionQueueItem {
  id: string;
  key: string;
  title: string;
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  queue_position: number;
  execution_state: DashboardExecutionState;
  is_next_work: boolean;
  epic?: Epic;
  changes_count: number;
  tasks_total: number;
  tasks_completed: number;
  progress_pct: number;
  open_questions_count: number;
  pending_dependencies_count: number;
  pending_dependency_keys: string[];
  updated_at: string;
}

export interface DashboardHumanAttention {
  total: number;
  open_questions_count: number;
  pending_approvals_count: number;
  stalled_changes_count: number;
  items: DashboardReviewItem[];
}

export interface DashboardActiveChangeHealth {
  change_id: string;
  change_key?: string | null;
  change_slug: string;
  phase: string;
  repository_name?: string | null;
  tasks_completed: number;
  tasks_total: number;
  started_at?: string | null;
  last_progress_at?: string | null;
  elapsed_seconds: number;
  is_stalled: boolean;
  story_id?: string | null;
  story_key?: string | null;
  story_title?: string | null;
  story_tasks_completed: number;
  story_tasks_total: number;
  story_progress_pct: number;
}

export interface DashboardEngineHealth {
  status: 'ACTIVE' | 'STALLED' | 'IDLE' | 'BLOCKED';
  threshold_seconds: number;
  active_change?: DashboardActiveChangeHealth | null;
}

export interface DashboardProgressSummary {
  stories_done: number;
  stories_active: number;
  stories_planning: number;
  stories_blocked_dep: number;
  stories_blocked_human: number;
  stories_total: number;
  tasks_completed: number;
  tasks_total: number;
  unestimated_stories_count: number;
}

export interface DashboardThroughputBucket {
  bucket_start: string;
  label: string;
  tasks_completed: number;
  changes_completed: number;
  stories_completed: number;
}

export interface DashboardThroughput {
  window_24h: DashboardThroughputBucket[];
  window_7d: DashboardThroughputBucket[];
  tasks_completed_24h: number;
  tasks_completed_7d: number;
  changes_completed_24h: number;
  changes_completed_7d: number;
  stories_completed_24h: number;
  stories_completed_7d: number;
  tasks_per_hour_24h: number;
  tasks_per_day_7d: number;
  trend_pct: number;
  trend_direction: 'UP' | 'DOWN' | 'FLAT';
  avg_change_cycle_minutes?: number | null;
}

export interface ProjectDashboardResponse {
  project_id: string;
  project_key: string;
  project_name: string;
  pending_total: number;
  backlog_count: number;
  todo_count: number;
  in_progress_count: number;
  in_review_count: number;
  open_questions_count: number;
  blocking_questions_count: number;
  pending_stories: DashboardPendingStoryItem[];
  last_completed_story: DashboardCompletedStoryItem | null;
  recent_completed_stories: DashboardCompletedStoryItem[];
  last_completed_change: DashboardCompletedChangeItem | null;
  recent_completed_changes: DashboardCompletedChangeItem[];
  next_work?: NextWorkResponse | null;
  review_items_count: number;
  review_items: DashboardReviewItem[];
  execution_queue: DashboardExecutionQueueItem[];
  human_attention?: DashboardHumanAttention;
  pipeline_pending_items?: DashboardReviewItem[];
  dependency_waits?: DashboardReviewItem[];
  engine_health?: DashboardEngineHealth;
  progress_summary?: DashboardProgressSummary;
  throughput?: DashboardThroughput;
}
