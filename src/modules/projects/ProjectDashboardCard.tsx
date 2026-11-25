import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, HelpCircle, Layers, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Project } from '../../types';

interface ProjectDashboardCardProps {
  project: Project;
}

export const ProjectDashboardCard: React.FC<ProjectDashboardCardProps> = ({ project }) => {
  const hasStories = project.progress_pct !== null;

  return (
    <Card className="hover:shadow-md transition border-slate-200">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
              {project.key}
            </span>
            <Badge variant={project.status === 'ACTIVE' ? 'success' : 'secondary'}>
              {project.status}
            </Badge>
          </div>
          <CardTitle className="mt-2 text-lg text-slate-900">{project.name}</CardTitle>
        </div>
        {project.open_questions_count > 0 && (
          <Link to={`/questions?project=${project.key}`}>
            <Badge variant="warning" className="cursor-pointer hover:bg-amber-200 flex items-center space-x-1">
              <HelpCircle className="w-3 h-3" />
              <span>{project.open_questions_count} pendientes</span>
            </Badge>
          </Link>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {project.workspace_path && (
          <p className="text-xs text-slate-500 font-mono truncate" title={project.workspace_path}>
            📁 {project.workspace_path}
          </p>
        )}

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs font-medium text-slate-600 mb-1.5">
            <span>Avance de Historias</span>
            <span>{hasStories ? `${project.progress_pct}%` : 'Sin historias'}</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${project.progress_pct || 0}%` }}
            />
          </div>
        </div>

        {/* Info tags */}
        <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1">
          {project.ungrouped_changes_count > 0 && (
            <span className="flex items-center space-x-1 text-slate-600">
              <Layers className="w-3.5 h-3.5" />
              <span>{project.ungrouped_changes_count} changes sin agrupar</span>
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1">
          <Link to={`/projects/${project.key}/dashboard`}>
            <Button variant="ghost" size="sm" className="text-xs text-indigo-700 hover:bg-indigo-50 flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Operaciones</span>
            </Button>
          </Link>
          <Link to={`/projects/${project.key}/changes`}>
            <Button variant="ghost" size="sm" className="text-xs text-slate-600">
              Changes & Repos
            </Button>
          </Link>
        </div>
        <Link to={`/projects/${project.key}`}>
          <Button variant="primary" size="sm" className="flex items-center space-x-1">
            <span>Tablero Kanban</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
