-- Promote the specific user to admin
UPDATE sse_user SET role = 'SYSTEM_ADMIN' WHERE email = 'viktor.pivenoff@gmail.com';
