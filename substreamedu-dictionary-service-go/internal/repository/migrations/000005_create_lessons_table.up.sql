CREATE TABLE IF NOT EXISTS lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    share_token VARCHAR(32) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    target_level VARCHAR(10) DEFAULT 'B1',
    media_source TEXT,
    youtube_id VARCHAR(32),
    content JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_share_token ON lessons(share_token);
CREATE INDEX IF NOT EXISTS idx_lessons_user_created ON lessons(user_id, created_at DESC);
