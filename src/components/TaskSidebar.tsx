import React from 'react';
import { Plus, Trash2, LogOut, User, Bot } from 'lucide-react';
import type { UserTask, AuthUser } from '../types/index';

interface TaskSidebarProps {
  tasks: UserTask[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onOpenCreateModal: () => void;
  onGoHome: () => void;
  onDeleteTask: (taskId: string, e: React.MouseEvent) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onOpenN8nChat?: () => void;
}

export const TaskSidebar: React.FC<TaskSidebarProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
  onOpenCreateModal,
  onGoHome,
  onDeleteTask,
  isOpenMobile,
  onCloseMobile,
  currentUser,
  onLogout,
  onOpenN8nChat,
}) => {

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-50 border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <button
            onClick={() => {
              onGoHome();
              onCloseMobile();
            }}
            className="text-left font-black tracking-tight text-slate-900 text-sm hover:opacity-80 transition-opacity cursor-pointer"
          >
            DO IT FOR ME
          </button>

          <button
            onClick={() => {
              onOpenCreateModal();
              onCloseMobile();
            }}
            title="Create new task"
            className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Section title & New Task button */}
        <div className="p-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              MY TASKS
            </span>
            <span className="text-xs font-semibold text-slate-400">
              {tasks.length}
            </span>
          </div>

          <button
            onClick={() => {
              onOpenCreateModal();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors text-left cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>+ New Task</span>
          </button>

          {onOpenN8nChat && (
            <button
              onClick={() => {
                onOpenN8nChat();
                onCloseMobile();
              }}
              className="w-full mt-1.5 flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-800 bg-white hover:bg-indigo-50/50 border border-slate-200/80 rounded-xl transition-colors text-left cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                <span>n8n AI Agent</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>
          )}
        </div>


        {/* Real User Tasks list (NO fake data) */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          {tasks.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              No tasks created yet.
            </div>
          ) : (
            tasks.map((task) => {
              const isSelected = selectedTaskId === task.id;
              const completedCount = task.steps.filter((s) => s.completed).length;

              return (
                <div
                  key={task.id}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                    isSelected
                      ? 'bg-white font-bold text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                  }`}
                >
                  <button
                    onClick={() => {
                      onSelectTask(task.id);
                      onCloseMobile();
                    }}
                    className="flex-1 text-left min-w-0 pr-2 truncate cursor-pointer"
                  >
                    <span className="truncate block">{task.title}</span>
                    <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                      {completedCount}/{task.steps.length} done
                    </span>
                  </button>

                  <button
                    onClick={(e) => onDeleteTask(task.id, e)}
                    title="Delete task"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Session & Logout Footer */}
        {currentUser && (
          <div className="p-3 border-t border-slate-200 bg-white/60">
            <div className="flex items-center justify-between px-2 py-1">
              <div className="min-w-0 flex-1 pr-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Logged in as
                </span>
                <span className="text-xs font-semibold text-slate-800 truncate block">
                  {currentUser.username}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
