CREATE TABLE IF NOT EXISTS bot_sessions (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    session_type VARCHAR(50) NOT NULL,
    session_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    UNIQUE(chat_id, session_type)
);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_expires ON bot_sessions(expires_at);
