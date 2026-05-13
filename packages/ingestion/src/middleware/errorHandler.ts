import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino({ name: 'middleware:error' });

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  logger.error({
    statusCode, code, message: err.message,
    path: req.path, method: req.method, stack: err.stack,
  }, 'Request error');

  res.status(statusCode).json({
    error: err.message || 'Internal server error',
    code,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
  });
}
