-- Down migration: No-op as healing historical data states cannot be deterministically reversed.
-- Retaining cards in 'review' state is safe and prevents data corruption.
SELECT 1;
