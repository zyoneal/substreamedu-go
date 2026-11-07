-- Database Migrations for Admin Dashboard
-- Run these on sse_iam
ALTER TABLE sse_user ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'USER' NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON sse_user(role);

-- Optional: Promote a specific user to admin (replace email)
-- UPDATE sse_user SET role = 'SYSTEM_ADMIN' WHERE email = 'YOUR_EMAIL@gmail.com';
