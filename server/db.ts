import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const TASKS_FILE = path.resolve(DATA_DIR, 'tasks.json');
const SESSIONS_FILE = path.resolve(DATA_DIR, 'sessions.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Helpers for safe JSON persistence
function readJson<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJson<T>(filePath: string, data: T): void {
  try {
    const tempFile = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

export interface DbUser {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface DbSession {
  token: string;
  userId: string;
  username: string;
  createdAt: string;
}

export interface DbStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  order: number;
}

export interface DbTask {
  id: string;
  userId: string;
  title: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  steps: DbStep[];
}

export const db = {
  // Users
  getUsers(): DbUser[] {
    return readJson<DbUser[]>(USERS_FILE, []);
  },
  findUserByUsername(username: string): DbUser | undefined {
    const users = this.getUsers();
    return users.find((u) => u.username.toLowerCase() === username.toLowerCase().trim());
  },
  findUserById(id: string): DbUser | undefined {
    const users = this.getUsers();
    return users.find((u) => u.id === id);
  },
  createUser(user: DbUser): void {
    const users = this.getUsers();
    users.push(user);
    writeJson(USERS_FILE, users);
  },

  // Sessions
  getSessions(): DbSession[] {
    return readJson<DbSession[]>(SESSIONS_FILE, []);
  },
  findSessionByToken(token: string): DbSession | undefined {
    const sessions = this.getSessions();
    return sessions.find((s) => s.token === token);
  },
  createSession(session: DbSession): void {
    const sessions = this.getSessions();
    sessions.push(session);
    writeJson(SESSIONS_FILE, sessions);
  },
  deleteSession(token: string): void {
    const sessions = this.getSessions().filter((s) => s.token !== token);
    writeJson(SESSIONS_FILE, sessions);
  },

  // Tasks
  getTasks(): DbTask[] {
    return readJson<DbTask[]>(TASKS_FILE, []);
  },
  getTasksByUserId(userId: string): DbTask[] {
    const tasks = this.getTasks();
    return tasks
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },
  getTaskById(taskId: string): DbTask | undefined {
    const tasks = this.getTasks();
    return tasks.find((t) => t.id === taskId);
  },
  createTask(task: DbTask): void {
    const tasks = this.getTasks();
    tasks.push(task);
    writeJson(TASKS_FILE, tasks);
  },
  updateTask(taskId: string, userId: string, updates: Partial<DbTask>): DbTask | null {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === taskId && t.userId === userId);
    if (index === -1) return null;

    const existing = tasks[index];
    const updated: DbTask = {
      ...existing,
      ...updates,
      id: existing.id,
      userId: existing.userId,
      updatedAt: new Date().toISOString(),
    };
    tasks[index] = updated;
    writeJson(TASKS_FILE, tasks);
    return updated;
  },
  deleteTask(taskId: string, userId: string): boolean {
    const tasks = this.getTasks();
    const initialLen = tasks.length;
    const remaining = tasks.filter((t) => !(t.id === taskId && t.userId === userId));
    if (remaining.length === initialLen) return false;
    writeJson(TASKS_FILE, remaining);
    return true;
  },

  UPLOADS_DIR,
};
