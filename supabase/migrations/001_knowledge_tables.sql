-- ============================================================
-- StudyBuddyAI RAG: Supabase Setup (run this in the Supabase SQL editor)
-- ============================================================

-- 1. Enable the pgvector extension
create extension if not exists vector with schema extensions;

-- 2. Parent table: stores metadata about each uploaded document
create table if not exists public.knowledge_docs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text not null default 'general',
  chunk_count integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 3. Child table: stores individual text chunks with their vector embeddings
create table if not exists public.knowledge_chunks (
  id          uuid primary key default gen_random_uuid(),
  doc_id      uuid not null references public.knowledge_docs(id) on delete cascade,
  chunk_index integer not null default 0,
  content     text not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now()
);

-- 4. Create index for fast vector similarity search
create index if not exists knowledge_chunks_embedding_idx
  on public.knowledge_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 5. RPC function for vector similarity search (called from Next.js API)
create or replace function public.match_knowledge_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  match_threshold float default 0.5
)
returns table (
  id          uuid,
  doc_id      uuid,
  doc_title   text,
  content     text,
  similarity  float
)
language plpgsql
as $$
begin
  return query
  select
    kc.id,
    kc.doc_id,
    kd.title as doc_title,
    kc.content,
    1 - (kc.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.knowledge_docs kd on kd.id = kc.doc_id
  where 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 6. Grant access (service role has full access by default, but be explicit)
alter table public.knowledge_docs enable row level security;
alter table public.knowledge_chunks enable row level security;

-- Allow service role full access (our Next.js API uses service role key)
create policy "Service role can manage knowledge_docs"
  on public.knowledge_docs
  for all
  using (true)
  with check (true);

create policy "Service role can manage knowledge_chunks"
  on public.knowledge_chunks
  for all
  using (true)
  with check (true);
