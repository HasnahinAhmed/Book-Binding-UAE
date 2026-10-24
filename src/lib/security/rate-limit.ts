/**
 * Fixed-window rate limiter kept in memory.
 * Good for a single server process. With several instances, swap the store
 * for a shared one (Redis / Upstash) behind the same interface.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export function createRateLimiter(opts: { limit: number; windowMs: number; now?: () => number; maxKeys?: number }): RateLimiter {
  const now = opts.now ?? Date.now;
  const maxKeys = opts.maxKeys ?? 10_000;
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key) {
      const t = now();
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= t) {
        if (hits.size >= maxKeys) {
          for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
          // still full: drop the oldest entry so memory stays bounded
          if (hits.size >= maxKeys) hits.delete(hits.keys().next().value as string);
        }
        entry = { count: 0, resetAt: t + opts.windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      const ok = entry.count <= opts.limit;
      return {
        ok,
        remaining: Math.max(0, opts.limit - entry.count),
        retryAfterSec: ok ? 0 : Math.ceil((entry.resetAt - t) / 1000),
      };
    },
  };
}
