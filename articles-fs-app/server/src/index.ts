import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { z } from 'zod';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { promises as fsp } from 'fs';
import multer, { MulterError } from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import { ArticleStore } from './articles';
import { CommentStore } from './comments';
import { initDb } from './db';
import { WorkspaceStore } from './workspaces';
import type { Attachment } from './types/article';

const PORT = Number(process.env.PORT ?? 4000);
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const ATTACHMENTS_DIR = process.env.ATTACHMENTS_DIR ?? path.join(DATA_DIR, 'uploads');

fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

const ensureUploadDir = (articleId: string) => {
  const dir = path.join(ATTACHMENTS_DIR, articleId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const removeAttachmentDir = async (articleId: string) => {
  const dir = path.join(ATTACHMENTS_DIR, articleId);
  await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
};

const isAllowedMime = (mime: string) => mime.startsWith('image/') || mime === 'application/pdf';

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const dir = ensureUploadDir(req.params.id);
      cb(null, dir);
    } catch (err) {
      cb(err as Error, '');
    }
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '';
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter(_req, file, cb) {
    if (!isAllowedMime(file.mimetype)) {
      return cb(new Error('Only 5MB files are allowed'));
    }
    cb(null, true);
  },
});

const attachmentUpload = upload.single('file');

const articles = new ArticleStore();
const comments = new CommentStore();
const workspaces = new WorkspaceStore();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(ATTACHMENTS_DIR));

const server = http.createServer(app);

type NotificationMessage =
  | { type: 'articleUpdated'; articleId: string; title: string; timestamp: string }
  | { type: 'attachmentAdded'; articleId: string; title: string; attachment: Attachment; timestamp: string };

const wss = new WebSocketServer({ server, path: '/ws' });

const broadcast = (message: NotificationMessage) => {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
};

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  socket.on('error', () => {
    socket.close();
  });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/workspaces', async (_req, res) => {
  const list = await workspaces.list();
  res.json(list);
});

app.post('/api/workspaces', async (req, res) => {
  const parsed = WorkspaceInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  try {
    const created = await workspaces.create(parsed.data);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

app.get('/api/articles', async (req, res) => {
  const workspaceId = (req.query.workspaceId as string) || 'default';
  const workspace = await workspaces.get(workspaceId);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }
  const list = await articles.list(workspaceId);
  res.json(list);
});

app.get('/api/articles/:id', async (req, res) => {
  const a = await articles.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Article not found' });
  res.json(a);
});

const WorkspaceInput = z.object({
  id: z.string().trim().min(1, 'Workspace id is required').max(50, 'Id too long').optional(),
  name: z.string().trim().min(2, 'Name is too short').max(120, 'Name too long'),
});

const ArticleInput = z.object({
  workspaceId: z.string().trim().min(1, 'Workspace is required'),
  title: z.string().trim().min(3, 'Title is too short').max(120, 'Title too long'),
  content: z.string().trim().min(1, 'Content is required'),
});

const ArticleUpdateInput = ArticleInput.extend({
  workspaceId: ArticleInput.shape.workspaceId.optional(),
});

const CommentInput = z.object({
  author: z.string().trim().max(80, 'Author name too long').optional(),
  body: z.string().trim().min(1, 'Comment body is required'),
});

app.post('/api/articles', async (req, res) => {
  const parsed = ArticleInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  try {
    const workspace = await workspaces.get(parsed.data.workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const created = await articles.create(parsed.data);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: 'Failed to save article' });
  }
});

app.put('/api/articles/:id', async (req, res) => {
  const parsed = ArticleUpdateInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  try {
    const existing = await articles.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }
    if (parsed.data.workspaceId) {
      const workspace = await workspaces.get(parsed.data.workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
    }
    const updated = await articles.update(req.params.id, parsed.data);
    res.json(updated);
    if (updated) {
      broadcast({
        type: 'articleUpdated',
        articleId: updated.id,
        title: updated.title,
        timestamp: updated.updatedAt ?? new Date().toISOString(),
      });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to update article' });
  }
});

app.get('/api/articles/:id/comments', async (req, res) => {
  const article = await articles.get(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  res.json(article.comments ?? []);
});

app.post('/api/articles/:id/comments', async (req, res) => {
  const parsed = CommentInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const article = await articles.get(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  try {
    const saved = await comments.create(article.id, parsed.data);
    res.status(201).json(saved);
  } catch (e) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.put('/api/articles/:id/comments/:commentId', async (req, res) => {
  const parsed = CommentInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  const article = await articles.get(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  try {
    const updated = await comments.update(article.id, req.params.commentId, parsed.data);
    if (!updated) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

app.delete('/api/articles/:id/comments/:commentId', async (req, res) => {
  const article = await articles.get(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }
  try {
    const removed = await comments.delete(article.id, req.params.commentId);
    if (!removed) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

app.post('/api/articles/:id/attachments', async (req, res) => {
  const article = await articles.get(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  return attachmentUpload(req, res, async (err) => {
    if (err) {
      if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File is too large (max 5MB)' });
      }
      return res.status(400).json({ error: err.message || 'Failed to upload file' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    const now = new Date().toISOString();
    const attachment: Attachment = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/${article.id}/${file.filename}`,
      createdAt: now,
    };

    try {
      const saved = await articles.addAttachment(article.id, attachment);
      if (!saved) {
        await fsp.unlink(file.path).catch(() => {});
        return res.status(500).json({ error: 'Failed to save attachment' });
      }
      res.status(201).json(saved);
      broadcast({
        type: 'attachmentAdded',
        articleId: article.id,
        title: article.title,
        attachment: saved,
        timestamp: now,
      });
    } catch (error) {
      await fsp.unlink(file.path).catch(() => {});
      res.status(500).json({ error: 'Failed to save attachment' });
    }
  });
});

app.delete('/api/articles/:id/attachments/:attachmentId', async (req, res) => {
  const article = await articles.get(req.params.id);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  try {
    const removed = await articles.removeAttachment(article.id, req.params.attachmentId);
    if (!removed) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    const filePath = path.join(ATTACHMENTS_DIR, article.id, removed.fileName);
    await fsp.unlink(filePath).catch(() => {});
    res.status(204).end();
    broadcast({
      type: 'articleUpdated',
      articleId: article.id,
      title: article.title,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
});

app.delete('/api/articles/:id', async (req, res) => {
  try {
    const existing = await articles.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }
    await articles.delete(req.params.id);
    await removeAttachmentDir(req.params.id);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

initDb()
  .then(() => workspaces.ensureDefault())
  .then(() => {
    server.listen(PORT, () => {
      console.log(`\n API ready on http://localhost:${PORT}`);
      console.log(`Data dir: ${DATA_DIR}`);
      console.log(`Attachments dir: ${ATTACHMENTS_DIR}`);
      console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
    });
  })
  .catch((err) => {
    console.error('Unable to start server because the database connection failed.');
    console.error(err);
    process.exit(1);
  });
