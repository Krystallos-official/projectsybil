import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../config';
import pino from 'pino';

const logger = pino({ name: 'middleware:auth' });

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const config = getConfig();

  // Skip auth in development mode
  if (config.NODE_ENV === 'development') {
    req.userId = 'dev-user';
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : error }, 'Token verification failed');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
