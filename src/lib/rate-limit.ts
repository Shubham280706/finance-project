/**
 * Lightweight in-memory token-bucket rate limiter for the MVP. Structured so an
 * Upstash Redis implementation can replace `consume()` later without touching
 * callers. State is per-process; on serverless it is best-effort, not strict.
 */
type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * @param key      unique bucket key (e.g. `chat:1.2.3.4`)
 * @param limit    max tokens (requests) per window
 * @param windowMs refill window in ms
 */
export function consume(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const refillRate = limit / windowMs; // tokens per ms
  const existing = buckets.get(key);

  let tokens: number;
  if (!existing) {
    tokens = limit;
  } else {
    const elapsed = now - existing.updatedAt;
    tokens = Math.min(limit, existing.tokens + elapsed * refillRate);
  }

  if (tokens < 1) {
    const needed = 1 - tokens;
    const retryAfterSeconds = Math.ceil(needed / refillRate / 1000);
    buckets.set(key, { tokens, updatedAt: now });
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  tokens -= 1;
  buckets.set(key, { tokens, updatedAt: now });
  return {
    allowed: true,
    remaining: Math.floor(tokens),
    retryAfterSeconds: 0,
  };
}

export const LIMITS = {
  chat: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 / hour
  ingest: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 / hour
} as const;
