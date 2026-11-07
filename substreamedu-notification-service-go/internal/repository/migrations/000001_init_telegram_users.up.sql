-- Create telegram_users table for persisting chat_id to user_id mappings
CREATE TABLE IF NOT EXISTS telegram_users (
    chat_id BIGINT PRIMARY KEY,
    user_id UUID NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast user_id lookups (for daily review job)
CREATE INDEX IF NOT EXISTS idx_telegram_users_user_id ON telegram_users(user_id) WHERE is_active = TRUE;

-- Index for updated_at (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_telegram_users_updated_at ON telegram_users(updated_at);
