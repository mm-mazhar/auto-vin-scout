REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM authenticated;

GRANT ALL ON TABLE public."_prisma_migrations" TO postgres;
GRANT ALL ON TABLE public."_prisma_migrations" TO service_role;

-----------------------------------------------------
-- Optional Check Use this to inspect current grants:
-----------------------------------------------------
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = '_prisma_migrations'
ORDER BY grantee, privilege_type;