import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChangeArtifact } from '../../types';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Check, AlertTriangle, ShieldCheck, Copy, Code, Eye, FileText } from 'lucide-react';

interface OpenSpecArtifactReadOnlyViewerProps {
  artifacts: ChangeArtifact[];
  onApproveArtifact: (artifactId: string) => Promise<void>;
  selectedPath?: string;
  onSelectPathChange?: (relPath: string) => void;
}

export const OpenSpecArtifactReadOnlyViewer: React.FC<OpenSpecArtifactReadOnlyViewerProps> = ({
  artifacts,
  onApproveArtifact,
  selectedPath,
  onSelectPathChange,
}) => {
  const [selectedRelPath, setSelectedRelPath] = useState<string>(
    selectedPath || artifacts[0]?.rel_path || ''
  );
  const [viewMode, setViewMode] = useState<'rendered' | 'raw'>('rendered');
  const [copied, setCopied] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (selectedPath && artifacts.some((a) => a.rel_path === selectedPath)) {
      setSelectedRelPath(selectedPath);
    } else if (artifacts.length > 0 && !artifacts.some((a) => a.rel_path === selectedRelPath)) {
      setSelectedRelPath(artifacts[0].rel_path);
    }
  }, [selectedPath, artifacts, selectedRelPath]);

  const handleSelectPath = (relPath: string) => {
    setSelectedRelPath(relPath);
    if (onSelectPathChange) {
      onSelectPathChange(relPath);
    }
  };

  const currentArt = artifacts.find((a) => a.rel_path === selectedRelPath) || artifacts[0];

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 bg-white rounded-lg border border-slate-200">
        No se han indexado archivos markdown para este Change.
      </div>
    );
  }

  const handleApprove = async () => {
    if (!currentArt) return;
    setApproving(true);
    try {
      await onApproveArtifact(currentArt.artifact_id || currentArt.rel_path);
    } finally {
      setApproving(false);
    }
  };

  const handleCopy = async () => {
    if (!currentArt?.content) return;
    await navigator.clipboard.writeText(currentArt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isApproved = currentArt?.review_status === 'APPROVED';
  const isStale = currentArt?.is_approval_stale;
  const lineCount = currentArt?.content ? currentArt.content.split('\n').length : 0;

  return (
    <div className="flex flex-col border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
      {/* File Selector Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-wrap gap-1.5">
          {artifacts.map((a) => {
            const isSelected = currentArt?.rel_path === a.rel_path;
            return (
              <button
                key={a.rel_path}
                onClick={() => handleSelectPath(a.rel_path)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-300 hover:text-indigo-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5 opacity-80" />
                <span>{a.rel_path}</span>
              </button>
            );
          })}
        </div>

        {currentArt && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              {lineCount} líneas · SHA: {currentArt.source_sha256.slice(0, 8)}
            </span>

            {/* Toggle Rendered / Raw */}
            <div className="flex rounded-md bg-slate-200/70 p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setViewMode('rendered')}
                className={`px-2 py-0.5 rounded flex items-center space-x-1 transition ${
                  viewMode === 'rendered' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Vista</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-2 py-0.5 rounded flex items-center space-x-1 transition ${
                  viewMode === 'raw' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Code className="w-3 h-3" />
                <span>Fuente</span>
              </button>
            </div>

            <Button
              type="button"
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2"
              title="Copiar contenido de OpenSpec"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </Button>

            {isStale && (
              <Badge variant="warning" className="flex items-center space-x-1 text-[10px]">
                <AlertTriangle className="w-3 h-3 mr-0.5" />
                <span>Modificado tras aprobación</span>
              </Badge>
            )}

            {isApproved && !isStale && (
              <Badge variant="success" className="flex items-center space-x-1 text-[10px]">
                <ShieldCheck className="w-3 h-3 mr-0.5" />
                <span>Aprobado</span>
              </Badge>
            )}

            <Button
              onClick={handleApprove}
              disabled={approving || (isApproved && !isStale)}
              variant="outline"
              size="sm"
              className="text-xs h-7"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              <span>{isApproved && !isStale ? 'Aprobado' : 'Aprobar Revisión'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Content Viewer */}
      <div className="p-6 overflow-y-auto max-h-[600px]">
        {currentArt?.content ? (
          viewMode === 'raw' || currentArt.rel_path.endsWith('.yaml') ? (
            <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {currentArt.content}
            </pre>
          ) : (
            <div className="prose prose-slate prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentArt.content}</ReactMarkdown>
            </div>
          )
        ) : (
          <div className="text-slate-400 italic text-sm">Archivo vacío o sin contenido registrado.</div>
        )}
      </div>
    </div>
  );
};
