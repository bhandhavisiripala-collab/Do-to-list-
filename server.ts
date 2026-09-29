import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Static serving for uploaded task images
app.use('/uploads', express.static(db.UPLOADS_DIR));

// Initialize Gemini SDK with User-Agent as required by AI Studio guidelines
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Auth Middleware
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  const token = authHeader.split(' ')[1];
  const session = db.findSessionByToken(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
  (req as any).user = { id: session.userId, username: session.username };
  next();
};

// Multer storage for task images
const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, db.UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const cleanName = `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, cleanName);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format. Please upload a JPG, JPEG, PNG, or WEBP image.'));
    }
  },
});

// ========================
// AUTHENTICATION ROUTES
// ========================

// POST /api/auth/register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters.' });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const trimmedUsername = username.trim();
    const existing = db.findUserByUsername(trimmedUsername);
    if (existing) {
      return res.status(400).json({ error: 'Username is already taken. Please choose another or log in.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const newUser = {
      id: userId,
      username: trimmedUsername,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    db.createUser(newUser);

    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    db.createSession({
      token,
      userId,
      username: trimmedUsername,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      user: { id: userId, username: trimmedUsername },
      token,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please enter both username and password.' });
    }

    const user = db.findUserByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    db.createSession({
      token,
      userId: user.id,
      username: user.username,
      createdAt: new Date().toISOString(),
    });

    return res.json({
      user: { id: user.id, username: user.username },
      token,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to log in. Please try again.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticate, (req: Request, res: Response) => {
  const user = (req as any).user;
  return res.json({ user });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    db.deleteSession(token);
  }
  return res.json({ success: true });
});

// ========================
// TASKS ROUTES (Persistent & User-Specific)
// ========================

// GET /api/tasks (Returns only authenticated user's tasks)
app.get('/api/tasks', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const tasks = db.getTasksByUserId(userId);
  return res.json({ tasks });
});

// POST /api/tasks (Creates a task for authenticated user)
app.post('/api/tasks', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { title, steps, imageUrl } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required.' });
  }

  const taskId = `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const newTask = {
    id: taskId,
    userId,
    title: title.trim(),
    imageUrl: imageUrl || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: Array.isArray(steps) ? steps : [],
  };

  db.createTask(newTask);
  return res.status(201).json({ task: newTask });
});

// PUT /api/tasks/:id (Updates task owned by authenticated user)
app.put('/api/tasks/:id', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const taskId = req.params.id;
  const { title, steps, imageUrl } = req.body;

  const updates: any = {};
  if (title !== undefined) updates.title = String(title).trim();
  if (steps !== undefined && Array.isArray(steps)) updates.steps = steps;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;

  const updated = db.updateTask(taskId, userId, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Task not found or unauthorized.' });
  }

  return res.json({ task: updated });
});

// DELETE /api/tasks/:id (Deletes task owned by authenticated user)
app.delete('/api/tasks/:id', authenticate, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const taskId = req.params.id;

  const task = db.getTaskById(taskId);
  if (task && task.userId === userId && task.imageUrl && task.imageUrl.startsWith('/uploads/')) {
    const filename = path.basename(task.imageUrl);
    const filepath = path.join(db.UPLOADS_DIR, filename);
    try {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch (_) {}
  }

  const deleted = db.deleteTask(taskId, userId);
  if (!deleted) {
    return res.status(404).json({ error: 'Task not found or unauthorized.' });
  }

  return res.json({ success: true });
});

// ========================
// TASK IMAGE UPLOAD & REMOVE
// ========================

// POST /api/tasks/:id/image
app.post('/api/tasks/:id/image', authenticate, (req: Request, res: Response) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image file too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file to upload.' });
    }

    const taskId = req.params.id;
    const userId = (req as any).user.id;
    const task = db.getTaskById(taskId);

    if (!task || task.userId !== userId) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {}
      return res.status(404).json({ error: 'Task not found or unauthorized.' });
    }

    // Delete old image if existed
    if (task.imageUrl && task.imageUrl.startsWith('/uploads/')) {
      const oldFilename = path.basename(task.imageUrl);
      const oldPath = path.join(db.UPLOADS_DIR, oldFilename);
      try {
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (_) {}
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const updated = db.updateTask(taskId, userId, { imageUrl });

    return res.json({ imageUrl, task: updated });
  });
});

// DELETE /api/tasks/:id/image
app.delete('/api/tasks/:id/image', authenticate, (req: Request, res: Response) => {
  const taskId = req.params.id;
  const userId = (req as any).user.id;
  const task = db.getTaskById(taskId);

  if (!task || task.userId !== userId) {
    return res.status(404).json({ error: 'Task not found or unauthorized.' });
  }

  if (task.imageUrl && task.imageUrl.startsWith('/uploads/')) {
    const filename = path.basename(task.imageUrl);
    const filepath = path.join(db.UPLOADS_DIR, filename);
    try {
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    } catch (_) {}
  }

  const updated = db.updateTask(taskId, userId, { imageUrl: null });
  return res.json({ success: true, task: updated });
});

// ========================
// GEMINI AI PLANNING ROUTES
// ========================

async function callGeminiStructured(contents: string, systemInstruction: string) {
  if (!ai) throw new Error('Gemini API key is not configured on the server.');

  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text;
      if (responseText) {
        const parsed = JSON.parse(responseText.trim());
        if (parsed && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          return parsed.steps.map((s: any) => ({
            title: String(s.title || 'Untitled Step').trim(),
            description: String(s.description || '').trim(),
          }));
        }
      }
    } catch (err: any) {
      console.warn(`Attempt with ${model} failed:`, err?.message || err);
      continue;
    }
  }

  throw new Error('This model is currently experiencing high demand. Please try again in a few moments.');
}

// POST /api/generate-plan
app.post('/api/generate-plan', async (req: Request, res: Response) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Please enter a task or goal.' });
  }

  const systemInstruction = `
You are the planning engine for "DO IT FOR ME".
When a user tells you what they want to get done, generate a practical, sequential step-by-step plan.
Each step must be actionable, concise, and realistic.
Generate between 4 to 7 clear steps.

You MUST respond strictly with valid JSON conforming to this schema:
{
  "steps": [
    {
      "title": "Short title of the step",
      "description": "Clear practical description explaining what needs to be done."
    }
  ]
}

Do NOT include markdown fences, extra commentary, or conversational filler. Output only JSON.
`;

  try {
    const steps = await callGeminiStructured(`Task to plan: "${prompt.trim()}"`, systemInstruction);
    return res.json({ steps });
  } catch (error: any) {
    console.error('Error in generate-plan:', error);
    return res.status(503).json({
      error: error.message || 'Failed to generate plan. Please try again.',
    });
  }
});

// POST /api/update-plan
app.post('/api/update-plan', async (req: Request, res: Response) => {
  const { taskTitle, currentSteps, userInstruction } = req.body;

  if (!userInstruction || typeof userInstruction !== 'string' || !userInstruction.trim()) {
    return res.status(400).json({ error: 'Please enter instructions for updating the plan.' });
  }

  const systemInstruction = `
You are the plan updater for "DO IT FOR ME".
The user has an existing plan for the task "${taskTitle || 'My Task'}".
The user wants to update the plan with this instruction: "${userInstruction.trim()}".

IMPORTANT RULES:
1. Preserve manually edited steps and the overall flow whenever possible.
2. Incorporate the user's new constraint, status update, or request seamlessly.
3. Remove or mark as done redundant steps if the user says something is already completed.
4. Keep the output focused, practical, and sequential (4 to 7 steps).

You MUST respond strictly with valid JSON conforming to this schema:
{
  "steps": [
    {
      "title": "Short title of the step",
      "description": "Clear practical description."
    }
  ]
}

Output only JSON.
`;

  const userPrompt = `
Task: ${taskTitle || 'Untitled Task'}
Existing Steps:
${(currentSteps || []).map((s: any, i: number) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')}

User Update Instruction:
"${userInstruction.trim()}"
`;

  try {
    const steps = await callGeminiStructured(userPrompt, systemInstruction);
    return res.json({ steps });
  } catch (error: any) {
    console.error('Error in update-plan:', error);
    return res.status(503).json({
      error: error.message || 'Failed to update plan. Please try again.',
    });
  }
});

// ========================
// N8N AI AGENT CHAT PROXY
// ========================

app.post('/api/n8n-chat', async (req: Request, res: Response) => {
  const { message, sessionId, webhookUrl } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const targetUrl =
    webhookUrl && typeof webhookUrl === 'string' && webhookUrl.trim()
      ? webhookUrl.trim()
      : 'https://sbhandhavi21.app.n8n.cloud/webhook/845861b4-d675-4c88-8109-02a5e7acef3d/chat';

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sendMessage',
        sessionId: sessionId || `session_${Date.now()}`,
        chatInput: message.trim(),
        message: message.trim(),
      }),
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { text: responseText };
    }

    if (!response.ok) {
      const isInactive = response.status === 404 && data?.hint?.includes('active');
      return res.status(response.status).json({
        error: data.message || `Webhook returned status ${response.status}`,
        hint: data.hint || (isInactive ? 'The workflow must be active in n8n for this webhook to respond.' : undefined),
        isInactiveWorkflow: isInactive,
      });
    }

    // Determine reply string from common n8n response structures
    const reply =
      data.output ||
      data.text ||
      data.response ||
      data.message ||
      (typeof data === 'string' ? data : JSON.stringify(data, null, 2));

    return res.json({
      reply,
      raw: data,
    });
  } catch (error: any) {
    console.error('Error communicating with n8n webhook:', error);
    return res.status(502).json({
      error: 'Unable to reach the n8n AI agent webhook.',
      details: error.message,
    });
  }
});


// Vite Server (Dev) or Static Build (Prod)
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DO IT FOR ME server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
