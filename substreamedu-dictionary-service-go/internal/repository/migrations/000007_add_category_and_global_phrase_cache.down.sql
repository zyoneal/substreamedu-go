DROP TABLE IF EXISTS global_phrase_categories;
DROP INDEX IF EXISTS idx_dictionary_user_category;
ALTER TABLE dictionary DROP COLUMN IF EXISTS category;
