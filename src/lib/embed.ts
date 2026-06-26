import { getEnv } from "./env";

const MISTRAL_URL = "https://api.mistral.ai/v1/embeddings";
const MODEL = "mistral-embed";
const DIMENSIONS = 1024; // mistral-embed => 1024, matches the pgvector column.
const MAX_BATCH = 32; // keep each request well under the per-request token cap
const MIN_SPACING_MS = 1200; // <1 req/sec, shared across all in-flight ingests
const MAX_RETRIES = 6;
const MAX_BACKOFF_MS = 60_000;
const DEFAULT_COOLDOWN_MS = 20_000; // when a 429 gives no Retry-After

// input_type is kept for call-site compatibility; mistral-embed has no such
// parameter, so it is accepted and ignored.
export type EmbeddingInputType = "document" | "query";

/** Thrown when embedding fails specifically because of sustained rate limiting. */
export class EmbeddingRateLimitError extends Error {
  constructor() {
    super("Mistral embedding rate limit exceeded");
    this.name = "EmbeddingRateLimitError";
  }
}

/**
 * Embed an array of texts with mistral-embed. All requests flow through a
 * single process-wide queue that serializes calls, enforces minimum spacing,
 * and observes a shared cooldown after any 429 — so several concurrent ingests
 * (Fluid Compute reuses instances) can't collectively exceed the rate limit.
 * Retries honor Retry-After. Validates the returned dimension (1024) so a
 * silent mismatch with the pgvector column can never reach the DB.
 */
export async function embedTexts(
  texts: string[],
  _inputType: EmbeddingInputType,
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const { MISTRAL_API_KEY } = getEnv();

  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const batch = texts.slice(i, i + MAX_BATCH);
    const vectors = await embedBatchWithRetry(batch, MISTRAL_API_KEY);
    out.push(...vectors);
  }
  return out;
}

/** Convenience for embedding a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text], "query");
  return vec;
}

// ── Process-wide rate-limited queue ─────────────────────────────────────────
let queue: Promise<unknown> = Promise.resolve();
let cooldownUntil = 0;
let lastRequestAt = 0;

/** Run a task serialized behind every other embedding task in this process. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task);
  // Keep the chain alive even if a task rejects.
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function embedBatchWithRetry(
  batch: string[],
  apiKey: string,
): Promise<number[][]> {
  let sawRateLimit = false;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await enqueue(() => embedBatch(batch, apiKey));
    } catch (err) {
      lastErr = err;
      if (err instanceof RateLimitError) {
        sawRateLimit = true;
        // Apply a shared cooldown so queued batches wait out the window too.
        const wait = err.retryAfterMs || DEFAULT_COOLDOWN_MS;
        cooldownUntil = Math.max(cooldownUntil, Date.now() + wait);
      }
      if (attempt === MAX_RETRIES) break;
      const backoff =
        err instanceof RateLimitError
          ? err.retryAfterMs || DEFAULT_COOLDOWN_MS
          : Math.min(MAX_BACKOFF_MS, 1500 * 2 ** attempt + Math.random() * 500);
      await sleep(backoff);
    }
  }

  if (sawRateLimit) throw new EmbeddingRateLimitError();
  throw new Error(
    `Mistral embedding failed after ${MAX_RETRIES + 1} attempts: ${String(lastErr)}`,
  );
}

class RateLimitError extends Error {
  constructor(public retryAfterMs: number) {
    super("Mistral rate limited (429)");
    this.name = "RateLimitError";
  }
}

async function embedBatch(
  batch: string[],
  apiKey: string,
): Promise<number[][]> {
  // Respect the shared cooldown, then enforce minimum spacing between requests.
  const cooldownLeft = cooldownUntil - Date.now();
  if (cooldownLeft > 0) await sleep(cooldownLeft);
  const sinceLast = Date.now() - lastRequestAt;
  if (sinceLast < MIN_SPACING_MS) await sleep(MIN_SPACING_MS - sinceLast);
  lastRequestAt = Date.now();

  const res = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ model: MODEL, input: batch }),
  });

  if (res.status === 429) {
    const header = res.headers.get("retry-after");
    const parsed = header ? Number(header) * 1000 : NaN;
    throw new RateLimitError(Number.isFinite(parsed) ? parsed : DEFAULT_COOLDOWN_MS);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Mistral ${res.status}: ${body}`);
  }

  const json = (await res.json()) as {
    data: { embedding: number[]; index: number }[];
  };

  // Order is not guaranteed; sort by index to align with inputs.
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  const vectors = sorted.map((d) => d.embedding);

  if (vectors.length !== batch.length) {
    throw new Error(
      `Mistral returned ${vectors.length} vectors for ${batch.length} inputs`,
    );
  }
  for (const v of vectors) {
    if (v.length !== DIMENSIONS) {
      throw new Error(`Mistral returned dim ${v.length}, expected ${DIMENSIONS}`);
    }
  }
  return vectors;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
