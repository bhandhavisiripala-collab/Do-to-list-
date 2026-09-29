import React, { useState, useRef } from 'react';
import { ArrowLeft, Sparkles, Send, X, AlertCircle, ImagePlus, Loader2, Trash2, RefreshCw } from 'lucide-react';
import type { UserTask, PlanStep } from '../types/index';
import { StepCard } from './StepCard';

interface TaskDetailProps {
  task: UserTask;
  onBack: () => void;
  onUpdateStep: (stepId: string, updates: Partial<PlanStep>) => void;
  onDeleteStep: (stepId: string) => void;
  onAddStepAtIndex: (index: number) => void;
  onMoveStep: (stepId: string, direction: 'up' | 'down') => void;
  onAskAIUpdate: (instruction: string) => Promise<void>;
  isUpdatingPlan: boolean;
  onUploadImage: (file: File) => Promise<void>;
  onRemoveImage: () => Promise<void>;
  isUploadingImage: boolean;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  onBack,
  onUpdateStep,
  onDeleteStep,
  onAddStepAtIndex,
  onMoveStep,
  onAskAIUpdate,
  isUpdatingPlan,
  onUploadImage,
  onRemoveImage,
  isUploadingImage,
}) => {
  const [showAIBox, setShowAIBox] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);

  // Image upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const completedCount = task.steps.filter((s) => s.completed).length;
  const totalCount = task.steps.length;

  const handleAIUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInstruction.trim() || isUpdatingPlan) return;
    setAiError(null);
    try {
      await onAskAIUpdate(aiInstruction.trim());
      setAiInstruction('');
      setShowAIBox(false);
    } catch (err: any) {
      setAiError(err.message || 'Failed to update plan. Please try again.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError(null);

    // Validate format
    const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validFormats.includes(file.type.toLowerCase())) {
      setImageError('Unsupported file format. Please upload a JPG, JPEG, PNG, or WEBP image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('File is too large. Maximum allowed size is 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      await onUploadImage(file);
    } catch (err: any) {
      setImageError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImageClick = async () => {
    setImageError(null);
    try {
      await onRemoveImage();
    } catch (err: any) {
      setImageError(err.message || 'Failed to remove image.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Top Bar: Back & AI button */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Tasks</span>
        </button>

        <button
          onClick={() => {
            setShowAIBox((prev) => !prev);
            setAiError(null);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-700" />
          <span>Ask AI to update plan</span>
        </button>
      </div>

      {/* Task Heading & Overview */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex-1">
            {task.title}
          </h1>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Add Image Button when no image is uploaded */}
          {!task.imageUrl && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:border-slate-400 bg-white text-slate-700 hover:text-slate-900 transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isUploadingImage ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <ImagePlus className="w-3.5 h-3.5 text-slate-500" />
                  <span>+ Add Image</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Task Image Display (if uploaded) */}
        {task.imageUrl && (
          <div className="mt-4">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-72">
              <img
                src={task.imageUrl}
                alt={task.title}
                className="w-full h-auto max-h-72 object-cover"
              />
            </div>

            <div className="mt-2 flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 text-slate-500" />
                    <span>+ Change Image</span>
                  </>
                )}
              </button>

              <span className="text-slate-300">•</span>

              <button
                onClick={handleRemoveImageClick}
                disabled={isUploadingImage}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        )}

        {/* Image Error Alert */}
        {imageError && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{imageError}</span>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="font-bold underline ml-3 hover:text-rose-900 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Progress & Counts */}
        <div className="mt-4 flex items-center gap-4 text-xs font-medium text-slate-500">
          <span>{totalCount} {totalCount === 1 ? 'step' : 'steps'}</span>
          <span>•</span>
          <span className={completedCount === totalCount && totalCount > 0 ? 'text-emerald-600 font-semibold' : ''}>
            Progress: {completedCount}/{totalCount} completed
          </span>
        </div>

        {/* Minimal Progress Bar */}
        {totalCount > 0 && (
          <div className="mt-2.5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-800 transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* AI Replanning Box */}
      {showAIBox && (
        <div className="mb-8 p-5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-slate-700" />
              <span>Tell the AI what changed or what you need adjusted</span>
            </div>
            <button
              onClick={() => setShowAIBox(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-500 mb-3">
            Example: "The venue is already selected" or "We need to finish everything by 6 PM"
          </p>

          <form onSubmit={handleAIUpdateSubmit} className="space-y-3">
            <input
              type="text"
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              disabled={isUpdatingPlan}
              placeholder="e.g. The venue is already selected"
              className="w-full text-sm px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-medium"
            />

            {aiError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAIBox(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!aiInstruction.trim() || isUpdatingPlan}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isUpdatingPlan ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Updating Plan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    <span>Update Plan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PLAN Title */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          PLAN
        </h2>

        {/* Add Step Before Step 1 */}
        {task.steps.length > 0 && (
          <button
            onClick={() => onAddStepAtIndex(0)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline cursor-pointer"
          >
            + Add step before Step 1
          </button>
        )}
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {task.steps.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-sm text-slate-500 mb-3">No steps in this plan yet.</p>
            <button
              onClick={() => onAddStepAtIndex(0)}
              className="text-xs font-semibold text-slate-900 hover:underline cursor-pointer"
            >
              + Add a step
            </button>
          </div>
        ) : (
          task.steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <StepCard
                step={step}
                displayNumber={index + 1}
                isFirst={index === 0}
                isLast={index === task.steps.length - 1}
                onUpdate={(updates) => onUpdateStep(step.id, updates)}
                onDelete={() => onDeleteStep(step.id)}
                onMoveUp={() => onMoveStep(step.id, 'up')}
                onMoveDown={() => onMoveStep(step.id, 'down')}
              />

              {/* Add Step Between / After button */}
              <div className="flex items-center justify-center py-1 opacity-40 hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => onAddStepAtIndex(index + 1)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full transition-colors cursor-pointer"
                >
                  <span>+</span>
                  <span>Add step here</span>
                </button>
              </div>
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};
