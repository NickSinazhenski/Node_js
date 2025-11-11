import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { z } from 'zod';
import path from 'path';
import { ArticleStore } from './articles';

const PORT = Number(process.env.PORT ?? 4000);
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');

const store = new ArticleStore(DATA_DIR);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/articles', async (_req, res) => {
  const list = await store.list();
  res.json(list);
});

app.get('/api/articles/:id', async (req, res) => {
  const a = await store.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Article not found' });
  res.json(a);
});

const ArticleInput = z.object({
  title: z.string().trim().min(3, 'Title is too short').max(120, 'Title too long'),
  content: z.string().trim().min(1, 'Content is required'),
});

app.post('/api/articles', async (req, res) => {
  const parsed = ArticleInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  try {
    const created = await store.create(parsed.data);
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: 'Failed to save article' });
  }
});

app.put('/api/articles/:id', async (req, res) => {
  const parsed = ArticleInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }
  try {
    const existing = await store.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }
    const updated = await store.update(req.params.id, parsed.data);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update article' });
  }
});

app.delete('/api/articles/:id', async (req, res) => {
  try {
    const existing = await store.get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }
    await store.delete(req.params.id);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete article' });
  }
});

app.listen(PORT, () => {
  console.log(`\n API ready on http://localhost:${PORT}\nData dir: ${DATA_DIR}`);
});