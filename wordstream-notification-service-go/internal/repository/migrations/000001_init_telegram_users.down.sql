-- Rollback migration for telegram_users table
DROP INDEX IF EXISTS idx_telegram_users_updated_at;
DROP INDEX IF EXISTS idx_telegram_users_user_id;
DROP TABLE IF EXISTS telegram_users;
