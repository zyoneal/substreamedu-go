ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS embedding vector(384);
CREATE INDEX IF NOT EXISTS idx_dictionary_embedding ON dictionary USING hnsw (embedding vector_cosine_ops);
