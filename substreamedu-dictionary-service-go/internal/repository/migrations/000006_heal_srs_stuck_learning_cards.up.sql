-- 1. Heal cards trapped in 'learning' from previous sessions (last_reviewed < CURRENT_DATE)
-- Move them to 'review' with next_repetition_date = CURRENT_DATE, interval = 1 so they are scheduled for review today.
UPDATE dictionary
SET 
    status = 'review',
    learning_step = 0,
    learning_due = NULL,
    next_repetition_date = CURRENT_DATE,
    interval = 1,
    stability = 1.0,
    retrievability = 1.0
WHERE status = 'learning' 
  AND last_reviewed IS NOT NULL 
  AND last_reviewed < CURRENT_DATE;

-- 2. Reschedule cards that were over-scheduled to >= 14 days on day 1 (repetition_level = 1)
-- Reset them to CURRENT_DATE with interval = 1 so users can review them rather than waiting weeks.
UPDATE dictionary
SET 
    next_repetition_date = CURRENT_DATE,
    interval = 1,
    stability = 1.0
WHERE status = 'review' 
  AND repetition_level = 1 
  AND interval >= 14 
  AND last_reviewed >= CURRENT_DATE - INTERVAL '14 days';
