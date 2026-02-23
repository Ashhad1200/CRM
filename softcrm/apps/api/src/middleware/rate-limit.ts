import type { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { getConfig } from '../config/index.js';
import { RateLimitError } from '@softcrm/shared-kernel';

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(getConfig().REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
  }
  return redis;
}

/**
 * Redis sliding-window rate limiter.
 * Key: `rl:<ip>` or `rl:<apiKey>`.
 * Returns 429 with Retry-After header when exceeded.
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const config = getConfig();
  const key = `rl:${req.ip ?? 'unknown'}`;
  const windowMs = config.RATE_LIMIT_WINDOW_MS;
  const maxRequests = config.RATE_LIMIT_MAX_REQUESTS;

  try {
    const client = getRedis();
    const now = Date.now();
    const windowStart = now - windowMs;

    // Sliding window: add current timestamp, remove old entries
    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, now, `${now}:${Math.random()}`);
    pipeline.zcard(key);
    pipeline.pexpire(key, windowMs);
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;

    if (count > maxRequests) {
      const retryAfter = Math.ceil(windowMs / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      throw new RateLimitError(retryAfter);
    }

    next();
  } catch (err) {
    if (err instanceof RateLimitError) {
      next(err);
    } else {
      // Fail open — if Redis is down, allow the request
      next();
    }
  }
}
