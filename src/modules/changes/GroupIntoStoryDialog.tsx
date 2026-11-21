import React, { useState } from 'react';
import { Dialog } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Story } from '../../types';

interface GroupIntoStoryDialogProps {
  open: boolean;
  onClose: () => void;
  selectedChangeIds: string[];
  existingStories: Story[];
  onAttachToExisting: (storyRef: string) => Promise<void>;
  onCreateNewStoryWithChanges: (title: string) => Promise<void>;
}

export const GroupIntoStoryDialog: React.FC<GroupIntoStoryDialogProps> = ({
  open,
  onClose,
  selectedChangeIds,
  existingStories,
  onAttachToExisting,
  onCreateNewStoryWithChanges,
}) => {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [title, setTitle] = useState('');
  const [targetStoryRef, setTargetStoryRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'new') {
        if (!title.trim()) return;
        await onCreateNewStoryWithChanges(title);
      } else {
        if (!targetStoryRef) return;
        await onAttachToExisting(targetStoryRef);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Agrupar ${selectedChangeIds.length} Changes en Historia`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex border-b border-slate-200 pb-3 gap-4">
          <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              checked={mode === 'new'}
              onChange={() => setMode('new')}
              className="text-indigo-600"
            />
            <span>Crear Nueva Historia</span>
          </label>
          <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
              className="text-indigo-600"
            />
            <span>Vincular a Historia Existente</span>
          </label>
        </div>

        {mode === 'new' ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título de la Historia
            </label>
            <Input
              placeholder="Como usuario quiero..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Selecciona la Historia
            </label>
            <select
              value={targetStoryRef}
              onChange={(e) => setTargetStoryRef(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm"
              required
            >
              <option value="">Selecciona...</option>
              {existingStories.map((s) => (
                <option key={s.id} value={s.key}>
                  {s.key}: {s.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Agrupar Changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
