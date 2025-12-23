import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to your environment or .env file.');
}

export type AuthPayload = { userId: string; email: string };

export const signToken = (payload: AuthPayload) =>
  jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN });

export type AuthenticatedRequest = Request & { user?: AuthPayload };

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = header.replace('Bearer ', '').trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET as string) as AuthPayload;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
