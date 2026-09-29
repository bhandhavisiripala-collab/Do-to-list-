import React, { useState, useEffect } from 'react';
import { Menu, Plus, LogOut, Loader2, Bot } from 'lucide-react';
import { authService, taskService, aiService } from './services/api';
import type { UserTask, PlanStep, AuthUser } from './types/index';
import { AuthScreen } from './components/AuthScreen';
import { HomeScreen } from './components/HomeScreen';
import { TaskDetail } from './components/TaskDetail';
import { TaskSidebar } from './components/TaskSidebar';
import { CreateTaskModal } from './components/CreateTaskModal';
import { N8nChatWidget } from './components/N8nChatWidget';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isN8nChatOpen, setIsN8nChatOpen] = useState(false);


  // Check authentication session on mount
  useEffect(() => {
    async function initAuth() {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          // Load this user's persistent tasks
          const userTasks = await taskService.getTasks();
          setTasks(userTasks);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    initAuth();
  }, []);

  // When user logs in or creates an account
  const handleAuthSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    try {
      const userTasks = await taskService.getTasks();
      setTasks(userTasks);
      setSelectedTaskId(null);
    } catch (err) {
      console.error('Failed to load user tasks after login:', err);
    }
  };

  // Logout
  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setTasks([]);
    setSelectedTaskId(null);
    setIsMobileMenuOpen(false);
  };

  // Current selected task
  const currentTask = tasks.find((t) => t.id === selectedTaskId) || null;

  // Handle Create Task with Gemini API and save to persistent DB
  const handleCreateTask = async (title: string) => {
    setIsCreatingPlan(true);
    try {
      // 1. Generate plan using Gemini
      const response = await aiService.generatePlan(title);

      const newSteps: PlanStep[] = response.steps.map((s, idx) => ({
        id: `step-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        title: s.title,
        description: s.description,
        completed: false,
        order: idx + 1,
      }));

      // 2. Persist task to server database
      const createdTask = await taskService.createTask(title.trim(), newSteps);

      setTasks((prev) => [createdTask, ...prev]);
      setSelectedTaskId(createdTask.id);
      setIsCreateModalOpen(false);
    } finally {
      setIsCreatingPlan(false);
    }
  };

  // Handle Edit Step
  const handleUpdateStep = async (stepId: string, updates: Partial<PlanStep>) => {
    if (!currentTask) return;

    const updatedSteps = currentTask.steps.map((s) => {
      if (s.id === stepId) {
        return { ...s, ...updates };
      }
      return s;
    });

    // Optimistic UI update
    const updatedTask = { ...currentTask, steps: updatedSteps };
    setTasks((prev) => prev.map((t) => (t.id === currentTask.id ? updatedTask : t)));

    // Persist to server database
    try {
      await taskService.updateTask(currentTask.id, { steps: updatedSteps });
    } catch (err) {
      console.error('Failed to save step updates:', err);
    }
  };

  // Handle Delete Step
  const handleDeleteStep = async (stepId: string) => {
    if (!currentTask) return;

    const remainingSteps = currentTask.steps
      .filter((s) => s.id !== stepId)
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    // Optimistic update
    const updatedTask = { ...currentTask, steps: remainingSteps };
    setTasks((prev) => prev.map((t) => (t.id === currentTask.id ? updatedTask : t)));

    // Persist
    try {
      await taskService.updateTask(currentTask.id, { steps: remainingSteps });
    } catch (err) {
      console.error('Failed to persist step deletion:', err);
    }
  };

  // Handle Add Step Anywhere
  const handleAddStepAtIndex = async (index: number) => {
    if (!currentTask) return;

    const newStep: PlanStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: 'New Step',
      description: 'Add step description here...',
      completed: false,
      order: index + 1,
    };

    const currentSteps = [...currentTask.steps];
    currentSteps.splice(index, 0, newStep);

    // Renumber all steps automatically
    const renumbered = currentSteps.map((s, idx) => ({ ...s, order: idx + 1 }));

    // Optimistic update
    const updatedTask = { ...currentTask, steps: renumbered };
    setTasks((prev) => prev.map((t) => (t.id === currentTask.id ? updatedTask : t)));

    // Persist
    try {
      await taskService.updateTask(currentTask.id, { steps: renumbered });
    } catch (err) {
      console.error('Failed to persist inserted step:', err);
    }
  };

  // Handle Reorder Step
  const handleMoveStep = async (stepId: string, direction: 'up' | 'down') => {
    if (!currentTask) return;

    const currentIndex = currentTask.steps.findIndex((s) => s.id === stepId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentTask.steps.length) return;

    const newSteps = [...currentTask.steps];
    const [moved] = newSteps.splice(currentIndex, 1);
    newSteps.splice(targetIndex, 0, moved);

    // Renumber automatically
    const renumbered = newSteps.map((s, idx) => ({ ...s, order: idx + 1 }));

    // Optimistic update
    const updatedTask = { ...currentTask, steps: renumbered };
    setTasks((prev) => prev.map((t) => (t.id === currentTask.id ? updatedTask : t)));

    // Persist
    try {
      await taskService.updateTask(currentTask.id, { steps: renumbered });
    } catch (err) {
      console.error('Failed to persist step reordering:', err);
    }
  };

  // Handle Delete Entire Task
  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await taskService.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  // Handle Task Image Upload
  const handleUploadImage = async (file: File) => {
    if (!currentTask) return;
    setIsUploadingImage(true);
    try {
      const result = await taskService.uploadTaskImage(currentTask.id, file);
      setTasks((prev) =>
        prev.map((t) => (t.id === currentTask.id ? result.task : t))
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle Task Image Remove
  const handleRemoveImage = async () => {
    if (!currentTask) return;
    setIsUploadingImage(true);
    try {
      const updated = await taskService.deleteTaskImage(currentTask.id);
      setTasks((prev) =>
        prev.map((t) => (t.id === currentTask.id ? updated : t))
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle AI Replanning
  const handleAskAIUpdate = async (instruction: string) => {
    if (!currentTask) return;

    setIsUpdatingPlan(true);
    try {
      const response = await aiService.updatePlan(
        currentTask.title,
        currentTask.steps,
        instruction
      );

      // Re-map into PlanSteps preserving matched completion states
      const updatedSteps: PlanStep[] = response.steps.map((s, idx) => {
        const existing = currentTask.steps.find(
          (old) => old.title.toLowerCase().trim() === s.title.toLowerCase().trim()
        );

        return {
          id: existing ? existing.id : `step-${Date.now()}-${idx}`,
          title: s.title,
          description: s.description,
          completed: existing ? existing.completed : false,
          order: idx + 1,
        };
      });

      const updatedTask = await taskService.updateTask(currentTask.id, {
        steps: updatedSteps,
      });

      setTasks((prev) => prev.map((t) => (t.id === currentTask.id ? updatedTask : t)));
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  // If session check is in progress
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // If user is not logged in, show ONLY authentication interface
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Authenticated workspace
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans antialiased">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSelectedTaskId(null)}
            className="font-extrabold text-sm text-slate-900 cursor-pointer"
          >
            DO IT FOR ME
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsN8nChatOpen(true)}
            title="Chat with n8n AI Agent"
            className="p-1.5 text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
          >
            <Bot className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <TaskSidebar
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={(id) => setSelectedTaskId(id)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
          onGoHome={() => setSelectedTaskId(null)}
          onDeleteTask={handleDeleteTask}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenN8nChat={() => setIsN8nChatOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 md:ml-64 bg-white min-h-[calc(100vh-50px)]">
          {currentTask ? (
            <TaskDetail
              task={currentTask}
              onBack={() => setSelectedTaskId(null)}
              onUpdateStep={handleUpdateStep}
              onDeleteStep={handleDeleteStep}
              onAddStepAtIndex={handleAddStepAtIndex}
              onMoveStep={handleMoveStep}
              onAskAIUpdate={handleAskAIUpdate}
              isUpdatingPlan={isUpdatingPlan}
              onUploadImage={handleUploadImage}
              onRemoveImage={handleRemoveImage}
              isUploadingImage={isUploadingImage}
            />
          ) : (
            <HomeScreen
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onQuickCreate={handleCreateTask}
              isCreating={isCreatingPlan}
              hasTasks={tasks.length > 0}
            />
          )}
        </main>
      </div>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTask}
        isCreating={isCreatingPlan}
      />

      {/* n8n AI Agent Chat Widget */}
      <N8nChatWidget
        isOpen={isN8nChatOpen}
        onToggle={setIsN8nChatOpen}
      />
    </div>
  );

}
