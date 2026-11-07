CREATE TABLE IF NOT EXISTS sse_user (
    id uuid PRIMARY KEY,
    email varchar(64) UNIQUE NOT NULL,
    is_active boolean DEFAULT true,
    telegram_token varchar(255),
    is_premium boolean NOT NULL DEFAULT false,
    translation_count integer DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
