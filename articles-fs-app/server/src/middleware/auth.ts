import { Request, Response, NextFunction } from 'express';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '../users';

const JWT_SECRET = process.env.JWT_SECRET as Secret | undefined;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? '1h') as SignOptions['expiresIn'];

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to your environment or .env file.');
}

export type AuthPayload = { userId: string; email: string; role?: UserRole };

export const signToken = (payload: AuthPayload) => jwt.sign(payload, JWT_SECRET as Secret, { expiresIn: JWT_EXPIRES_IN });

export type AuthenticatedRequest = Request & { user?: { userId: string; email: string; role: UserRole } };

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.replace('Bearer ', '').trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as AuthPayload;
    req.user = { userId: payload.userId, email: payload.email, role: payload.role ?? 'user' };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};
