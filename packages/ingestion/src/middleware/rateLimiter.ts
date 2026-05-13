import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in 15 minutes.', code: 'RATE_LIMIT_EXCEEDED' },
});

export const syncRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Sync rate limit exceeded. Maximum 10 syncs per hour.', code: 'SYNC_RATE_LIMIT' },
});

export const analysisRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Analysis rate limit exceeded. Maximum 5 runs per 30 minutes.', code: 'ANALYSIS_RATE_LIMIT' },
});
