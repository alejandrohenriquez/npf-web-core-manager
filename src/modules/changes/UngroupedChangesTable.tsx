import React, { useState } from 'react';
import { Change } from '../../types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Layers, FileText, Search } from 'lucide-react';

interface UngroupedChangesTableProps {
  changes: Change[];
  onGroupSelected: (selectedIds: string[]) => void;
  onInspectChange?: (change: Change) => void;
  showGroupedToggle?: boolean;
  onlyUngrouped?: boolean;
  onToggleOnlyUngrouped?: (onlyUngrouped: boolean) => void;
}

export const UngroupedChangesTable: React.FC<UngroupedChangesTableProps> = ({
  changes,
  onGroupSelected,
  onInspectChange,
  showGroupedToggle = false,
  onlyUngrouped = false,
  onToggleOnlyUngrouped,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const filteredChanges = changes.filter((ch) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (ch.change_slug || '').toLowerCase().includes(q) ||
      (ch.key || '').toLowerCase().includes(q) ||
      (ch.repository_name || '').toLowerCase().includes(q) ||
      (ch.phase || '').toLowerCase().includes(q)
    );
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredChanges.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredChanges.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const getPhaseBadge = (phase: string) => {
    const styles: Record<string, string> = {
      ARCHIVED: 'bg-slate-100 text-slate-700 border-slate-200',
      VERIFYING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      APPLYING: 'bg-blue-50 text-blue-700 border-blue-200',
      READY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      BLOCKED: 'bg-red-50 text-red-700 border-red-200',
      PLANNING: 'bg-purple-50 text-purple-700 border-purple-200',
    };
    const cls = styles[phase] || 'bg-slate-100 text-slate-600 border-slate-200';
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[11px] font-semibold whitespace-nowrap ${cls}`}
      >
        {phase}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {showGroupedToggle && onToggleOnlyUngrouped && (
            <div className="inline-flex items-center rounded-md bg-slate-100 p-0.5 text-xs font-medium h-8">
              <button
                type="button"
                onClick={() => onToggleOnlyUngrouped(false)}
                className={`px-3 h-7 rounded transition whitespace-nowrap ${
                  !onlyUngrouped ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-slate-600'
                }`}
              >
                Todos los Changes
              </button>
              <button
                type="button"
                onClick={() => onToggleOnlyUngrouped(true)}
                className={`px-3 h-7 rounded transition whitespace-nowrap ${
                  onlyUngrouped ? 'bg-white text-indigo-700 shadow-sm font-semibold' : 'text-slate-600'
                }`}
              >
                Solo Sin Agrupar
              </button>
            </div>
          )}

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar por clave, slug, repo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="text-xs text-slate-500 whitespace-nowrap">
            Mostrando <span className="font-semibold text-slate-900">{filteredChanges.length}</span> de {changes.length} changes
          </div>
        </div>

        {selectedIds.length > 0 && (
          <Button
            onClick={() => onGroupSelected(selectedIds)}
            variant="primary"
            size="sm"
            className="inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Agrupar {selectedIds.length} en Historia</span>
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="w-10 px-3 py-3 text-center align-middle">
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={filteredChanges.length > 0 && selectedIds.length === filteredChanges.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </th>
              <th className="w-28 px-3 py-3 align-middle whitespace-nowrap">Clave</th>
              <th className="w-56 px-3 py-3 align-middle whitespace-nowrap">Repositorio</th>
              <th className="px-3 py-3 align-middle whitespace-nowrap">Slug del Change</th>
              <th className="w-36 px-3 py-3 align-middle whitespace-nowrap">Origen</th>
              <th className="w-28 px-3 py-3 align-middle whitespace-nowrap">Fase</th>
              <th className="w-24 px-3 py-3 text-center align-middle whitespace-nowrap">Tareas</th>
              <th className="w-40 px-4 py-3 text-right align-middle whitespace-nowrap">OpenSpec</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredChanges.map((ch) => (
              <tr
                key={ch.id}
                onClick={() => onInspectChange && onInspectChange(ch)}
                className={`hover:bg-indigo-50/40 transition ${onInspectChange ? 'cursor-pointer' : ''}`}
              >
                <td className="w-10 px-3 py-2.5 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(ch.id)}
                      onChange={() => toggleSelectOne(ch.id)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                </td>
                <td className="w-28 px-3 py-2.5 align-middle whitespace-nowrap font-mono text-xs">
                  {ch.key ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 whitespace-nowrap">
                      {ch.key}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-400 whitespace-nowrap">
                      Sin asignar
                    </span>
                  )}
                </td>
                <td className="w-56 px-3 py-2.5 align-middle whitespace-nowrap font-mono font-medium text-xs text-slate-900">
                  <div className="max-w-[220px] truncate" title={ch.repository_name || ''}>
                    {ch.repository_name || '—'}
                  </div>
                </td>
                <td className="px-3 py-2.5 align-middle font-mono text-xs text-slate-700 max-w-[280px]">
                  <div className="truncate" title={ch.change_slug || ch.name}>
                    {ch.change_slug || ch.name}
                  </div>
                </td>
                <td className="w-36 px-3 py-2.5 align-middle whitespace-nowrap">
                  <Badge
                    variant={ch.origin === 'IMPORTED_ARCHIVE' ? 'secondary' : 'default'}
                    className="text-[10px] whitespace-nowrap"
                  >
                    {ch.origin}
                  </Badge>
                </td>
                <td className="w-28 px-3 py-2.5 align-middle whitespace-nowrap">
                  {getPhaseBadge(ch.phase)}
                </td>
                <td className="w-24 px-3 py-2.5 text-center align-middle whitespace-nowrap font-mono text-xs tabular-nums">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold min-w-[42px]">
                    {ch.tasks_completed}/{ch.tasks_total}
                  </span>
                </td>
                <td className="w-40 px-4 py-2.5 text-right align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {onInspectChange && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onInspectChange(ch)}
                      className="inline-flex items-center gap-1.5 text-xs h-7 px-2.5 whitespace-nowrap"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Tareas & OpenSpec</span>
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {filteredChanges.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No se encontraron changes para el filtro seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
