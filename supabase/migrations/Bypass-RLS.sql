SET rls.bypass_rls = on;
SELECT * FROM "User" WHERE id::uuid = auth.uid();

SET rls.bypass_rls = on;
SELECT * FROM public."User";

SELECT id, email, created_at FROM auth.users;