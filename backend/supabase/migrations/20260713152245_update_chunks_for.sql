create or replace function match_chunks(
  query_embedding vector(3072),
  match_count int,
  match_threshold float,
  p_org_id uuid
)
returns table (
  id uuid,
  filename text,
  content text,
  page int,
  chunk_index int,
  similarity float
)
language sql stable
as $$
  select
    id, filename, content, page, chunk_index,
    1 - (embedding <=> query_embedding) as similarity
  from document_chunks
  where org_id = p_org_id
    and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;