import type { UserTask, PlanStep, AuthResponse, AuthUser, GeneratePlanResponse } from '../types/index';

const TOKEN_KEY = 'do_it_for_me_auth_token';

function getAuthHeaders(isJson = true): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const authService = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  async register(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account.');
    }

    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to log in.');
    }

    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders(false),
      });

      if (!res.ok) {
        this.clearToken();
        return null;
      }

      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(false),
      });
    } catch (e) {
      console.warn('Logout request failed', e);
    } finally {
      this.clearToken();
    }
  },
};

export const taskService = {
  async getTasks(): Promise<UserTask[]> {
    const res = await fetch('/api/tasks', {
      headers: getAuthHeaders(false),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to load tasks.');
    }

    const data = await res.json();
    return data.tasks || [];
  },

  async createTask(title: string, steps: PlanStep[] = []): Promise<UserTask> {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ title, steps }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to create task.');
    }

    const data = await res.json();
    return data.task;
  },

  async updateTask(taskId: string, updates: Partial<UserTask>): Promise<UserTask> {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to update task.');
    }

    const data = await res.json();
    return data.task;
  },

  async deleteTask(taskId: string): Promise<void> {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(false),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to delete task.');
    }
  },

  async uploadTaskImage(taskId: string, file: File): Promise<{ imageUrl: string; task: UserTask }> {
    const formData = new FormData();
    formData.append('image', file);

    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/tasks/${taskId}/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload image.');
    }

    return data;
  },

  async deleteTaskImage(taskId: string): Promise<UserTask> {
    const res = await fetch(`/api/tasks/${taskId}/image`, {
      method: 'DELETE',
      headers: getAuthHeaders(false),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to remove image.');
    }

    return data.task;
  },
};

export const aiService = {
  async generatePlan(prompt: string): Promise<GeneratePlanResponse> {
    const res = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error (${res.status})`);
    }

    return res.json();
  },

  async updatePlan(
    taskTitle: string,
    currentSteps: PlanStep[],
    userInstruction: string
  ): Promise<GeneratePlanResponse> {
    const res = await fetch('/api/update-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle, currentSteps, userInstruction }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error (${res.status})`);
    }

    return res.json();
  },
};

export interface N8nChatResponse {
  reply?: string;
  error?: string;
  hint?: string;
  isInactiveWorkflow?: boolean;
}

export const n8nService = {
  async sendMessage(
    message: string,
    sessionId?: string,
    webhookUrl?: string
  ): Promise<N8nChatResponse> {
    const res = await fetch('/api/n8n-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, webhookUrl }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        error: data.error || `Server error (${res.status})`,
        hint: data.hint,
        isInactiveWorkflow: data.isInactiveWorkflow,
      };
    }

    return {
      reply: data.reply || 'No response text received from agent.',
    };
  },
};

