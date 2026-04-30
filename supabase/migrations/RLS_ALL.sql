--  ───────────────────────────────────────────────────────────────
-- ─── 1. GLOBAL LOCKDOWN ───
-- ───────────────────────────────────────────────────────────────
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Subscription" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Organization" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrganizationMember" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Project" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."OrganizationInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrganizationInvite" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Vehicle" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Report" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."Recall" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recall" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."JobQueue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."JobQueue" FORCE ROW LEVEL SECURITY;

--  ───────────────────────────────────────────────────────────────
-- ─── 2. SERVICE ROLE BYPASS ───
-- ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.define_service_role_policy(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS "Service role bypass" ON public.%I', table_name);
  EXECUTE format('CREATE POLICY "Service role bypass" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', table_name);
END;
$$ LANGUAGE plpgsql;

SELECT public.define_service_role_policy('User');
SELECT public.define_service_role_policy('Subscription');
SELECT public.define_service_role_policy('Organization');
SELECT public.define_service_role_policy('OrganizationMember');
SELECT public.define_service_role_policy('Project');
SELECT public.define_service_role_policy('OrganizationInvite');
SELECT public.define_service_role_policy('Vehicle');
SELECT public.define_service_role_policy('Report');
SELECT public.define_service_role_policy('Recall');
SELECT public.define_service_role_policy('JobQueue');

--  ───────────────────────────────────────────────────────────────
-- ─── 3. USER TABLE ───
-- ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view and edit own profile" ON public."User";
CREATE POLICY "Users can view and edit own profile"
ON public."User" FOR ALL TO authenticated
USING (id = (SELECT auth.uid()::text))
WITH CHECK (id = (SELECT auth.uid()::text));

--  ───────────────────────────────────────────────────────────────
-- ─── 4. MULTI-TENANT ISOLATION (Org-Scoped) ───
-- ───────────────────────────────────────────────────────────────

-- ORGANIZATION
DROP POLICY IF EXISTS "Org: select by membership" ON public."Organization";
CREATE POLICY "Org: select by membership"
ON public."Organization" FOR SELECT TO authenticated
USING (id IN (SELECT m."organizationId" FROM public."OrganizationMember" m WHERE m."userId" = (SELECT auth.uid()::text)));

DROP POLICY IF EXISTS "Org: update by admin/owner" ON public."Organization";
CREATE POLICY "Org: update by admin/owner"
ON public."Organization" FOR UPDATE TO authenticated
USING (id IN (SELECT m."organizationId" FROM public."OrganizationMember" m WHERE m."userId" = (SELECT auth.uid()::text) AND m.role IN ('ADMIN', 'OWNER')));

-- ORGANIZATION MEMBERS
DROP POLICY IF EXISTS "OrgMember: select members in same org" ON public."OrganizationMember";
CREATE POLICY "OrgMember: select members in same org"
ON public."OrganizationMember" FOR SELECT TO authenticated
USING ("organizationId" IN (SELECT m."organizationId" FROM public."OrganizationMember" m WHERE m."userId" = (SELECT auth.uid()::text)));

-- PROJECTS
DROP POLICY IF EXISTS "Project: select by org membership" ON public."Project";
CREATE POLICY "Project: select by org membership"
ON public."Project" FOR SELECT TO authenticated
USING ("organizationId" IN (SELECT m."organizationId" FROM public."OrganizationMember" m WHERE m."userId" = (SELECT auth.uid()::text)));

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Subscription: select by org membership" ON public."Subscription";
CREATE POLICY "Subscription: select by org membership"
ON public."Subscription" FOR SELECT TO authenticated
USING ("organizationId" IN (SELECT m."organizationId" FROM public."OrganizationMember" m WHERE m."userId" = (SELECT auth.uid()::text)));

-- INVITES
DROP POLICY IF EXISTS "Invite: select by org admin or recipient" ON public."OrganizationInvite";
CREATE POLICY "Invite: select by org admin or recipient"
ON public."OrganizationInvite" FOR SELECT TO authenticated
USING ("organizationId" IN (SELECT m."organizationId" FROM public."OrganizationMember" m WHERE m."userId" = (SELECT auth.uid()::text) AND m.role IN ('ADMIN', 'OWNER')) OR email = (SELECT auth.jwt() ->> 'email'));

--  ───────────────────────────────────────────────────────────────
-- ─── 5. AUTO VIN SCOUT (Domain Specific) ───
-- ───────────────────────────────────────────────────────────────

-- REPORTS
DROP POLICY IF EXISTS "Report: select by org membership" ON public."Report";
CREATE POLICY "Report: select by org membership"
ON public."Report" FOR SELECT TO authenticated
USING ("organizationId" IN (SELECT m."organizationId" FROM public."OrganizationMember" m WHERE m."userId" = (SELECT auth.uid()::text)));

-- VEHICLES
DROP POLICY IF EXISTS "Vehicle: select by linked report" ON public."Vehicle";
CREATE POLICY "Vehicle: select by linked report"
ON public."Vehicle" FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public."Report" r WHERE r."vehicleId" = public."Vehicle".id AND r."organizationId" IN (SELECT m."organizationId" FROM public."OrganizationMember" m WHERE m."userId" = (SELECT auth.uid()::text))));

-- RECALLS
DROP POLICY IF EXISTS "Recall: select by linked vehicle report" ON public."Recall";
CREATE POLICY "Recall: select by linked vehicle report"
ON public."Recall" FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public."Report" r WHERE r."vehicleId" = public."Recall"."vehicleId" AND r."organizationId" IN (SELECT m."organizationId" FROM public."OrganizationMember" m WHERE m."userId" = (SELECT auth.uid()::text))));

-- JOB QUEUE
DROP POLICY IF EXISTS "JobQueue: select by org membership" ON public."JobQueue";
CREATE POLICY "JobQueue: select by org membership"
ON public."JobQueue" FOR SELECT TO authenticated
USING ("orgId" IN (SELECT m."organizationId" FROM public."OrganizationMember" m WHERE m."userId" = (SELECT auth.uid()::text)));

--  ───────────────────────────────────────────────────────────────
-- ─── 6. PRISMA MIGRATIONS PROTECTION ───
-- ───────────────────────────────────────────────────────────────

-- Enable RLS and Force it
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" FORCE ROW LEVEL SECURITY;

-- Remove public access
REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM authenticated;

-- Internal access only
GRANT ALL ON TABLE public."_prisma_migrations" TO postgres;
GRANT ALL ON TABLE public."_prisma_migrations" TO service_role;

-- RLS ENDS
-- ------------------------------------------------------

-- When logged in as a test user (via Supabase SQL editor)
SELECT * FROM "User" WHERE id::uuid = auth.uid();

-- Should be empty unless using service_role
SELECT * FROM "User" LIMIT 10;