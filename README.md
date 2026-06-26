# FilingIQ

**Chat with annual reports & earnings calls.** Upload a financial PDF (annual
report, 10-K, or earnings-call transcript) and ask questions in plain English.
Every answer is grounded in the document, cites the exact page, and the model
refuses to answer when the information isn't there — it never hallucinates a
financial number.

Built with Next.js 15, Supabase (Postgres + pgvector + Storage), Drizzle ORM,
Claude (Anthropic), and Mistral embeddings.

---

## How it works

```
Upload (browser → Supabase Storage via signed URL)
   → POST /api/ingest  (create row, then background: parse → chunk → embed → store)
   → poll GET /api/documents/:id until status = ready
   → POST /api/chat  (embed question → vector search → Claude with strict prompt)
   → grounded answer + page citations
```

- **Parsing:** LlamaParse (better tables) when `LLAMA_CLOUD_API_KEY` is set,
  otherwise `unpdf`. Scanned/image PDFs are detected and rejected with a clear
  message (OCR isn't supported).
- **Embeddings:** `mistral-embed`, 1024-dim, batched with throttling and
  retry/backoff that honors `Retry-After` on 429s (free-tier friendly).
- **Retrieval:** cosine similarity via the `match_chunks` Postgres function over
  an HNSW index, scoped to the active document.
- **Generation:** `claude-sonnet-4-6` (or `claude-haiku-4-5-20251001` in cheap
  mode) with a faithfulness prompt that forces page citations and refusal.

---

## Environment variables

Copy `.env.example` to `.env.local` and fill these in:

| Variable | Required | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | ✅ | Claude generation |
| `MISTRAL_API_KEY` | ✅ | Mistral embeddings (`mistral-embed`) |
| `DATABASE_URL` | ✅ | Supabase **pooled** Postgres connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key (browser upload) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only: storage + RPC |
| `LLAMA_CLOUD_API_KEY` | — | If set, use LlamaParse; else `unpdf` |
| `GENERATION_MODE` | — | `quality` (default) or `cheap` |

The app validates these at startup and fails fast with a clear message if a
required one is missing. Only `NEXT_PUBLIC_*` values reach the browser.

---

## Supabase setup

1. Create a Supabase project.
2. In the **SQL Editor**, run [`supabase/setup.sql`](supabase/setup.sql). This
   is idempotent and creates:
   - the `vector` extension,
   - the `documents` and `chunks` tables (with `vector(1024)`),
   - the HNSW cosine index,
   - the `match_chunks(query_embedding, match_count, doc_id)` function,
   - the private `filings` Storage bucket.
3. Grab your connection string (**Project Settings → Database → Connection
   pooling**), the project URL, the anon key, and the service-role key.

> Alternatively, `npm run db:push` applies the Drizzle schema, but you must
> still run `supabase/setup.sql` for the extension, `match_chunks` function, and
> storage bucket.

### Important: the embedding dimension is 1024 everywhere

`mistral-embed` returns 1024-dim vectors. The `chunks.embedding` column **and**
the `match_chunks` signature are both `vector(1024)`. Do not change one without
the other — a mismatch causes silent insert failures or runtime errors.

---

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in values
# run supabase/setup.sql in the Supabase SQL editor
npm run dev
```

Open http://localhost:3000. Health check: http://localhost:3000/api/health.

---

## Deploy (Vercel)

- The ingest route sets `export const maxDuration = 300` and processes in the
  background via `after()`, so it survives long parses on Fluid Compute.
- Uploads go **directly to Supabase Storage** (signed URL), so the 4.5 MB
  serverless body limit is never hit. Uploads are capped at 25 MB / 200 pages.
- Set all env vars in the Vercel project settings.

For very large filings you can also run the ingest worker on Railway — the
`processDocument` function in `src/lib/ingest.ts` has no Vercel-specific deps.

---

## Guardrails

- Every API route validates input with `zod`, returns `{ ok, data }` /
  `{ ok, error }`, and never leaks stack traces.
- Per-IP rate limits (in-memory token bucket, swappable for Upstash Redis):
  **20 chat messages** and **5 uploads** per IP per hour.
- Document status is tracked (`processing → ready → error`); the chat route
  refuses to answer until a document is `ready`, and surfaces ingest errors.

---

## Project structure

```
src/
  app/
    api/
      health/route.ts          GET  health check
      upload-url/route.ts      POST signed Supabase upload URL
      ingest/route.ts          POST create doc + background ingest (maxDuration 300)
      documents/[id]/route.ts  GET  document status (polled)
      chat/route.ts            POST grounded, cited answer
    layout.tsx  page.tsx       single-page UI
  components/                  UploadZone, Chat (+ citation pills)
  db/                          Drizzle schema & client
  lib/                         env, supabase, parse-pdf, chunk, embed,
                               retrieve, anthropic, rate-limit, api, client
supabase/setup.sql            one-time Supabase setup
```

> Answers are grounded in the uploaded document. For analysis only, not
> financial advice.
