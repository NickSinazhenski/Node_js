import { Router } from 'express';
import { z } from 'zod';
import type { UserStore } from '../users';
import { signToken } from '../middleware/auth';

const RegisterInput = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email').max(160, 'Email too long'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
});

const LoginInput = RegisterInput;

type Deps = {
  users: UserStore;
};

export const createAuthRouter = ({ users }: Deps) => {
  const router = Router();

  router.post('/register', async (req, res) => {
    const parsed = RegisterInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    try {
      const existing = await users.findByEmail(parsed.data.email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      const created = await users.create(parsed.data.email, parsed.data.password);
      const token = signToken({ userId: created.id, email: created.email, role: created.role });
      res.status(201).json({ token, user: created });
    } catch (err) {
      res.status(500).json({ error: 'Failed to register user' });
    }
  });

  router.post('/login', async (req, res) => {
    const parsed = LoginInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }
    try {
      const user = await users.verify(parsed.data.email, parsed.data.password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = signToken({ userId: user.id, email: user.email, role: user.role });
      res.json({ token, user });
    } catch (err) {
      res.status(500).json({ error: 'Failed to login' });
    }
  });

  return router;
};
