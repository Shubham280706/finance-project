import { getEnv } from "./env";

const MISTRAL_URL = "https://api.mistral.ai/v1/embeddings";
const MODEL = "mistral-embed";
const DIMENSIONS = 1024; // mistral-embed => 1024, matches the pgvector column.
const MAX_BATCH = 32; // keep each request well under the per-request token cap
const THROTTLE_MS = 1100; // ~1 req/sec to respect free-tier rate limits
const MAX_RETRIES = 4;

// input_type is kept for call-site compatibility; mistral-embed has no such
// parameter, so it is accepted and ignored.
export type EmbeddingInputType = "document" | "query";

/**
 * Embed an array of texts with mistral-embed. Batches into small groups,
 * throttles between requests, retries with backoff (honoring Retry-After on
 * 429s), and validates the returned dimension (1024) so a silent mismatch with
 * the pgvector column can never reach the DB.
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
    // Throttle between batches (skip after the last one).
    if (i + MAX_BATCH < texts.length) await sleep(THROTTLE_MS);
  }
  return out;
}

/** Convenience for embedding a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text], "query");
  return vec;
}

async function embedBatchWithRetry(
  batch: string[],
  apiKey: string,
): Promise<number[][]> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await embedBatch(batch, apiKey);
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_RETRIES) break;
      const retryAfter = err instanceof RateLimitError ? err.retryAfterMs : 0;
      // Rate limits are per-minute; back off long enough to actually clear them.
      const backoff = retryAfter || 2000 * 2 ** attempt + Math.random() * 500;
      await sleep(backoff);
    }
  }
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
    const retryAfterMs = header
      ? Number(header) * 1000
      : 30_000; // default: wait 30s for the per-minute window to reset
    throw new RateLimitError(
      Number.isFinite(retryAfterMs) ? retryAfterMs : 30_000,
    );
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
