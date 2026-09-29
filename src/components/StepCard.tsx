import React, { useState } from 'react';
import { Check, ChevronUp, ChevronDown, Trash2, Edit2 } from 'lucide-react';
import type { PlanStep } from '../types/index';

interface StepCardProps {
  step: PlanStep;
  displayNumber: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (updates: Partial<PlanStep>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const StepCard: React.FC<StepCardProps> = ({
  step,
  displayNumber,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(step.title);
  const [editDescription, setEditDescription] = useState(step.description);

  const handleSave = () => {
    onUpdate({
      title: editTitle.trim() || 'Untitled Step',
      description: editDescription.trim(),
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(step.title);
    setEditDescription(step.description);
    setIsEditing(false);
  };

  return (
    <div
      className={`p-5 rounded-2xl border transition-all text-left bg-white ${
        step.completed
          ? 'border-slate-200/80 bg-slate-50/50 opacity-80'
          : 'border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      {!isEditing ? (
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <button
            type="button"
            onClick={() => onUpdate({ completed: !step.completed })}
            className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer ${
              step.completed
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'border-slate-300 hover:border-slate-500 bg-white'
            }`}
            title={step.completed ? 'Mark as incomplete' : 'Mark as completed'}
          >
            {step.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              className={`text-base font-semibold text-slate-900 leading-snug ${
                step.completed ? 'line-through text-slate-400' : ''
              }`}
            >
              {displayNumber}. {step.title}
            </h3>

            {step.description && (
              <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                <span className="text-xs font-semibold text-slate-400 block mb-0.5">Description</span>
                <p className="whitespace-pre-wrap">{step.description}</p>
              </div>
            )}
          </div>

          {/* Action buttons (Reorder, Edit, Delete) */}
          <div className="flex items-center gap-1 flex-shrink-0 text-slate-400">
            {/* Move Up */}
            <button
              type="button"
              disabled={isFirst}
              onClick={onMoveUp}
              className="p-1 rounded hover:text-slate-900 hover:bg-slate-100 disabled:opacity-20 transition-colors"
              title="Move step up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* Move Down */}
            <button
              type="button"
              disabled={isLast}
              onClick={onMoveDown}
              className="p-1 rounded hover:text-slate-900 hover:bg-slate-100 disabled:opacity-20 transition-colors"
              title="Move step down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={() => {
                setEditTitle(step.title);
                setEditDescription(step.description);
                setIsEditing(true);
              }}
              className="p-1 rounded hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Edit step title and description"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete step"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Editing Step {displayNumber}
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
