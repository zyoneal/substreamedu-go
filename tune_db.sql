-- FAANG Senior Pattern: Performance Indexing for optimized lookups
-- Run this on sse_iam
CREATE INDEX IF NOT EXISTS idx_users_telegram_token ON sse_user(telegram_token);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON sse_user(is_active) WHERE is_active = true;

-- Run this on substreamedu_dictionary
CREATE INDEX IF NOT EXISTS idx_dictionary_user_id ON dictionary(user_id);
CREATE INDEX IF NOT EXISTS idx_dictionary_resource_name ON dictionary(resource_name);
CREATE INDEX IF NOT EXISTS idx_dictionary_status ON dictionary(status);
CREATE INDEX IF NOT EXISTS idx_dictionary_user_resource ON dictionary(user_id, resource_name);
CREATE INDEX IF NOT EXISTS idx_dictionary_next_repetition ON dictionary(next_repetition_date);
CREATE INDEX IF NOT EXISTS idx_dictionary_user_next_rep ON dictionary(user_id, next_repetition_date);
CREATE INDEX IF NOT EXISTS idx_dictionary_learning_due ON dictionary(learning_due);

-- Leech Detection Support
ALTER TABLE dictionary ADD COLUMN IF NOT EXISTS is_leech BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_dictionary_is_leech ON dictionary(is_leech) WHERE is_leech = TRUE;

-- Outbox pattern optimization
CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created ON outbox_events(status, created_at);

-- Streak calculation optimization
CREATE INDEX IF NOT EXISTS idx_review_log_user_date ON review_log(user_id, reviewed_at DESC);

-- Run this on substreamedu_media
CREATE INDEX IF NOT EXISTS idx_subtitle_user_id ON subtitle(user_id);
CREATE INDEX IF NOT EXISTS idx_subtitle_user_id_name ON subtitle(user_id, name);
