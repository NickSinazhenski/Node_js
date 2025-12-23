import { Router } from 'express';
import { z } from 'zod';
import type { WorkspaceStore } from '../workspaces';

const WorkspaceInput = z.object({
  id: z.string().trim().min(1, 'Workspace id is required').max(50, 'Id too long').optional(),
  name: z.string().trim().min(2, 'Name is too short').max(120, 'Name too long'),
});

type Deps = {
  workspaces: WorkspaceStore;
};

export const createWorkspacesRouter = ({ workspaces }: Deps) => {
  const router = Router();

  router.get('/', async (_req, res) => {
    const list = await workspaces.list();
    res.json(list);
  });

  router.post('/', async (req, res) => {
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

  return router;
};
