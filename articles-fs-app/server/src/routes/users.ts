import { Router } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { UserRole, UserStore } from '../users';

const RoleInput = z.object({
  role: z.enum(['admin', 'user']),
});

type Deps = {
  users: UserStore;
};

export const createUsersRouter = ({ users }: Deps) => {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      const list = await users.list();
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  router.patch('/:id/role', async (req: AuthenticatedRequest, res) => {
    if (req.user?.userId === req.params.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const parsed = RoleInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    try {
      const updated = await users.updateRole(req.params.id, parsed.data.role as UserRole);
      if (!updated) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Failed to update role' });
    }
  });

  return router;
};
