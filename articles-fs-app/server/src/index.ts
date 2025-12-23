import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'fs';
import http from 'http';
import morgan from 'morgan';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { ArticleStore } from './articles';
import { CommentStore } from './comments';
import { initDb } from './db';
import { createArticlesRouter } from './routes/articles';
import { createWorkspacesRouter } from './routes/workspaces';
import type { NotificationMessage } from './types/notifications';
import { WorkspaceStore } from './workspaces';

const PORT = Number(process.env.PORT ?? 4000);
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const ATTACHMENTS_DIR = process.env.ATTACHMENTS_DIR ?? path.join(DATA_DIR, 'uploads');

fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });

const articles = new ArticleStore();
const comments = new CommentStore();
const workspaces = new WorkspaceStore();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(ATTACHMENTS_DIR));

const server = http.createServer(app);

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
app.use('/api/workspaces', createWorkspacesRouter({ workspaces }));
app.use(
  '/api/articles',
  createArticlesRouter({ articles, comments, workspaces, attachmentsDir: ATTACHMENTS_DIR, broadcast }),
);

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
