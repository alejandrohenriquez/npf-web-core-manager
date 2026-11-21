import React from 'react';
import { CheckCircle2, Clock, FileText, ExternalLink } from 'lucide-react';

export type OpenSpecStageKey = 'proposal' | 'specs' | 'design' | 'tasks';

interface OpenSpecArtifactGraphProps {
  artifactStatus: Record<string, string>;
  skipSpecs?: boolean;
  activeStage?: OpenSpecStageKey | null;
  onSelectStage?: (stage: OpenSpecStageKey) => void;
}

export const OpenSpecArtifactGraph: React.FC<OpenSpecArtifactGraphProps> = ({
  artifactStatus,
  skipSpecs = false,
  activeStage = null,
  onSelectStage,
}) => {
  const getBadge = (status?: string) => {
    if (status === 'done') {
      return (
        <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>done</span>
        </span>
      );
    }
    if (status === 'skipped') {
      return (
        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
          skipped
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>pending</span>
      </span>
    );
  };

  const stages: { key: OpenSpecStageKey; label: string; status?: string }[] = [
    { key: 'proposal', label: 'proposal.md', status: artifactStatus['proposal'] },
    { key: 'specs', label: 'specs/', status: skipSpecs ? 'skipped' : artifactStatus['specs'] },
    { key: 'design', label: 'design.md', status: artifactStatus['design'] },
    { key: 'tasks', label: 'tasks.md', status: artifactStatus['tasks'] },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-indigo-600" />
          <span>Flujo OpenSpec:</span>
        </span>
        {stages.map((st, idx) => {
          const isActive = activeStage === st.key;
          return (
            <React.Fragment key={st.key}>
              {idx > 0 && <span className="text-slate-300 text-xs">→</span>}
              <button
                type="button"
                onClick={() => onSelectStage && onSelectStage(st.key)}
                title={`Ver documento generado por OpenSpec (${st.label})`}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-left transition ${
                  isActive
                    ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-500/30'
                    : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                }`}
              >
                <span className="text-xs font-mono font-medium text-slate-800">{st.label}</span>
                {getBadge(st.status)}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      {onSelectStage && (
        <span className="text-[11px] text-indigo-600 flex items-center gap-1 font-medium">
          <ExternalLink className="w-3 h-3" />
          <span>Clic en una etapa para ver su texto OpenSpec</span>
        </span>
      )}
    </div>
  );
};
