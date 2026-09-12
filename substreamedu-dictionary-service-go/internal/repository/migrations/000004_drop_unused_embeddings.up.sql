DROP INDEX IF EXISTS idx_dictionary_embedding;
ALTER TABLE dictionary DROP COLUMN IF EXISTS embedding;
