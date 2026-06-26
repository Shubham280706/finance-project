-- FilingIQ — one-time Supabase setup.
-- Run this in the Supabase SQL editor (or via the Drizzle migration).
-- It is idempotent and safe to re-run.

-- 1. pgvector extension.
create extension if not exists vector;

-- 2. Tables.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_path text not null,
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'error')),
  error_message text,
  page_count integer,
  chunk_count integer,
  created_at timestamptz not null default now()
);

create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,
  page_number integer not null,
  -- voyage-3.5 => 1024 dims. MUST match the column and match_chunks() below.
  embedding vector(1024) not null,
  created_at timestamptz not null default now()
);

-- 3. HNSW index for cosine similarity search.
create index if not exists chunks_embedding_idx
  on chunks using hnsw (embedding vector_cosine_ops);

create index if not exists chunks_document_id_idx
  on chunks (document_id);

-- 4. Cosine similarity search scoped to a single document.
create or replace function match_chunks(
  query_embedding vector(1024),
  match_count int,
  doc_id uuid
)
returns table (id uuid, content text, page_number int, similarity float)
language sql stable
as $$
  select c.id, c.content, c.page_number,
         1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where c.document_id = doc_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- 5. Storage bucket for uploaded PDFs (private; accessed via signed URLs).
insert into storage.buckets (id, name, public)
values ('filings', 'filings', false)
on conflict (id) do nothing;
