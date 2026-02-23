import { Router, type Request, type Response } from 'express';
import { getPrismaClient } from '@softcrm/db';
import { Redis } from 'ioredis';
import { getConfig } from './config/index.js';

export const healthRouter: Router = Router();

/** Basic liveness check — always 200 if the process is alive. */
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/** Readiness check — 200 if DB + Redis are healthy, 503 otherwise. */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, 'ok' | 'error'> = {};

  // Check PostgreSQL
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    checks['database'] = 'ok';
  } catch {
    checks['database'] = 'error';
  }

  // Check Redis
  try {
    const config = getConfig();
    const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.ping();
    await redis.quit();
    checks['redis'] = 'ok';
  } catch {
    checks['redis'] = 'error';
  }

  const allHealthy = Object.values(checks).every((v) => v === 'ok');
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});
