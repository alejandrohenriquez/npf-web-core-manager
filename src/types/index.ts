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
  created_at: string;
  updated_at: string;
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
  review_status: 'UNREVIEWED' | 'APPROVED';
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
  artifacts?: ChangeArtifact[];
  tasks?: TaskItem[];
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
  changes: Change[];
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
  status: 'OPEN' | 'ANSWERED' | 'DISMISSED';
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
