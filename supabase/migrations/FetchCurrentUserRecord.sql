-- When logged in as a test user (via Supabase SQL editor)
SELECT * FROM "User" WHERE id::uuid = auth.uid();

-- Should be empty unless using service_role
SELECT * FROM "User" LIMIT 10;