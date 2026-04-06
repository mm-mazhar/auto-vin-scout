**Enable RLS Scripts:**

Run these in the Supabase SQL Editor in the exact order shown

```sql
-- 1. Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationInvite" ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- USER TABLE
-- ========================================================
DROP POLICY IF EXISTS "Users can view own data" ON "User";
CREATE POLICY "Users can view own data" ON "User"
  FOR SELECT USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update own data" ON "User";
CREATE POLICY "Users can update own data" ON "User"
  FOR UPDATE USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can insert own data" ON "User";
CREATE POLICY "Users can insert own data" ON "User"
  FOR INSERT WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "Service role has full access" ON "User";
CREATE POLICY "Service role has full access" ON "User"
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');;

-- ========================================================
-- SUBSCRIPTION TABLE
-- ========================================================
-- Access via Organization Membership (Since subscription is now on Org)
DROP POLICY IF EXISTS "Sub: view by org member" ON "Subscription";
CREATE POLICY "Sub: view by org member" ON "Subscription"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Subscription"."organizationId"
      AND m."userId" = auth.uid()::text
    )
  );

-- Only Owners/Admins (and service role) can update subscriptions
DROP POLICY IF EXISTS "Sub: update by owner/admin" ON "Subscription";
CREATE POLICY "Sub: update by owner/admin" ON "Subscription"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Subscription"."organizationId"
      AND m."userId" = auth.uid()::text
      AND m."role"::text IN ('OWNER', 'ADMIN')
    )
  );

-- ========================================================
-- ORGANIZATION TABLE
-- ========================================================
DROP POLICY IF EXISTS "Org: select by membership" ON "Organization";
CREATE POLICY "Org: select by membership" ON "Organization"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Organization".id
      AND m."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Org: insert by authenticated" ON "Organization";
CREATE POLICY "Org: insert by authenticated" ON "Organization"
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Org: update by owner_or_admin" ON "Organization";
CREATE POLICY "Org: update by owner_or_admin" ON "Organization"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Organization".id
      AND m."userId" = auth.uid()::text
      AND m."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "Org: delete by owner" ON "Organization";
CREATE POLICY "Org: delete by owner" ON "Organization"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Organization".id
      AND m."userId" = auth.uid()::text
      AND m."role"::text = 'OWNER'
    )
  );

-- ========================================================
-- ORGANIZATION MEMBER TABLE
-- ========================================================
DROP POLICY IF EXISTS "OrgMember: select in same org" ON "OrganizationMember";
CREATE POLICY "OrgMember: select in same org" ON "OrganizationMember"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m2
      WHERE m2."organizationId" = "OrganizationMember"."organizationId"
      AND m2."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "OrgMember: insert by owner_or_admin" ON "OrganizationMember";
CREATE POLICY "OrgMember: insert by owner_or_admin" ON "OrganizationMember"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m2
      WHERE m2."organizationId" = "OrganizationMember"."organizationId"
      AND m2."userId" = auth.uid()::text
      AND m2."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "OrgMember: update by owner_or_admin" ON "OrganizationMember";
CREATE POLICY "OrgMember: update by owner_or_admin" ON "OrganizationMember"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m2
      WHERE m2."organizationId" = "OrganizationMember"."organizationId"
      AND m2."userId" = auth.uid()::text
      AND m2."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "OrgMember: delete by owner_or_admin" ON "OrganizationMember";
CREATE POLICY "OrgMember: delete by owner_or_admin" ON "OrganizationMember"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m2
      WHERE m2."organizationId" = "OrganizationMember"."organizationId"
      AND m2."userId" = auth.uid()::text
      AND m2."role"::text IN ('OWNER','ADMIN')
    )
  );

-- ========================================================
-- PROJECT TABLE
-- ========================================================
DROP POLICY IF EXISTS "Project: select by membership" ON "Project";
CREATE POLICY "Project: select by membership" ON "Project"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Project"."organizationId"
      AND m."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Project: insert by membership" ON "Project";
CREATE POLICY "Project: insert by membership" ON "Project"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Project"."organizationId"
      AND m."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Project: update by membership" ON "Project";
CREATE POLICY "Project: update by membership" ON "Project"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Project"."organizationId"
      AND m."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Project: delete by owner_or_admin" ON "Project";
CREATE POLICY "Project: delete by owner_or_admin" ON "Project"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "Project"."organizationId"
      AND m."userId" = auth.uid()::text
      AND m."role"::text IN ('OWNER','ADMIN')
    )
  );

-- ========================================================
-- ORGANIZATION INVITE TABLE
-- ========================================================
DROP POLICY IF EXISTS "Invite: select" ON "OrganizationInvite";
CREATE POLICY "Invite: select" ON "OrganizationInvite"
  FOR SELECT USING (
    -- Can see if member of org OR if invite is for me OR if I sent it
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "OrganizationInvite"."organizationId"
      AND m."userId" = auth.uid()::text
      AND m."role"::text IN ('OWNER','ADMIN')
    )
    OR "OrganizationInvite"."inviterId" = auth.uid()::text
    OR "OrganizationInvite"."email" = (auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Invite: insert by owner_or_admin" ON "OrganizationInvite";
CREATE POLICY "Invite: insert by owner_or_admin" ON "OrganizationInvite"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "OrganizationInvite"."organizationId"
      AND m."userId" = auth.uid()::text
      AND m."role"::text IN ('OWNER','ADMIN')
    )
  );

DROP POLICY IF EXISTS "Invite: update" ON "OrganizationInvite";
CREATE POLICY "Invite: update" ON "OrganizationInvite"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "OrganizationInvite"."organizationId"
      AND m."userId" = auth.uid()::text
      AND m."role"::text IN ('OWNER','ADMIN')
    )
    OR "OrganizationInvite"."inviterId" = auth.uid()::text
    OR "OrganizationInvite"."email" = (auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Invite: delete by owner_or_admin" ON "OrganizationInvite";
CREATE POLICY "Invite: delete by owner_or_admin" ON "OrganizationInvite"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "OrganizationMember" m
      WHERE m."organizationId" = "OrganizationInvite"."organizationId"
      AND m."userId" = auth.uid()::text
      AND m."role"::text IN ('OWNER','ADMIN')
    )
    OR "OrganizationInvite"."inviterId" = auth.uid()::text
  );

-- Service Role Policy (Global)
-- This ensures the backend (Node.js) can always bypass RLS if it uses the Service Role Key
CREATE POLICY "Service role has full access" ON "Organization" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON "OrganizationMember" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON "Project" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON "OrganizationInvite" FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role has full access" ON "Subscription" FOR ALL USING (auth.role() = 'service_role');