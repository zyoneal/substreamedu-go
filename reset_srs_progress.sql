-- Reset SRS progress for all users back to "new" state
-- This will wipe all memory of learned words and clear the review log.

BEGIN;

UPDATE dictionary 
SET 
    status = 'new', 
    ease_factor = 2.5, 
    interval = 0, 
    repetition_level = 0, 
    last_reviewed = NULL, 
    next_repetition_date = NULL, 
    difficulty_score = 0, 
    lapses = 0, 
    consecutive_success = 0, 
    total_reviews = 0, 
    correct_reviews = 0, 
    hard_count = 0, 
    learning_step = 0, 
    learning_due = NULL, 
    is_leech = false,
    stability = 0, 
    retrievability = 0, 
    rolling_retention = 0;

TRUNCATE TABLE review_log;

COMMIT;
