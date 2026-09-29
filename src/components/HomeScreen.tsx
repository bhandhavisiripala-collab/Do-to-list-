import React, { useState } from 'react';
import { Plus, Sparkles, AlertCircle } from 'lucide-react';

interface HomeScreenProps {
  onOpenCreateModal: () => void;
  onQuickCreate: (title: string) => Promise<void>;
  isCreating: boolean;
  hasTasks: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenCreateModal,
  onQuickCreate,
  isCreating,
  hasTasks,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || isCreating) return;
    setError(null);
    try {
      await onQuickCreate(quickInput.trim());
      setQuickInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to create plan.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center">
      {/* Title & Subtitle */}
      <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
        DO IT FOR ME
      </h1>
      <p className="mt-2 text-base text-slate-500 font-medium">
        Tell me what you need to get done.
      </p>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="mt-8">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 bg-white rounded-2xl border border-slate-200 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all text-left">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            disabled={isCreating}
            placeholder="Enter a new task..."
            className="flex-1 px-3 py-2 text-sm sm:text-base text-slate-900 placeholder-slate-400 bg-transparent border-none focus:outline-none"
          />

          <div className="flex items-center gap-1.5 justify-end">
            <button
              type="submit"
              disabled={!quickInput.trim() || isCreating}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 disabled:opacity-40 transition-colors"
            >
              {isCreating ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Planning...</span>
                </>
              ) : (
                <span>Create Task</span>
              )}
            </button>

            {/* Small + button */}
            <button
              type="button"
              onClick={onOpenCreateModal}
              title="Open task creation modal"
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-rose-600">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* Empty state when user has not created any task yet */}
      {!hasTasks && (
        <div className="mt-16 py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
          <p className="text-sm text-slate-400 font-medium">No tasks yet</p>
          <button
            onClick={onOpenCreateModal}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create your first task</span>
          </button>
        </div>
      )}
    </div>
  );
};
