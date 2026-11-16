ALTER TABLE dictionary
    DROP COLUMN IF EXISTS source_url,
    DROP COLUMN IF EXISTS timestamp_sec;
