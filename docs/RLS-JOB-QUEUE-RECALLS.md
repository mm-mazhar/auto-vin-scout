```sql
-- RLS Policies for Recall and JobQueue models
-- Apply to both DEV and PROD Supabase projects

-- ───────────────────────────────────────────────────────────────
-- ─── Enable RLS 
-- ───────────────────────────────────────────────────────────────

ALTER TABLE "Recall" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobQueue" ENABLE ROW LEVEL SECURITY;

-- ─── Recall ───────────────────────────────────────────────────────────────────
-- Recalls are vehicle-scoped. A user can read a recall if they belong to an org
-- that has a report linked to that vehicle.

DROP POLICY IF EXISTS "Recall: select by linked report membership" ON "Recall";
DROP POLICY IF EXISTS "Recall: service role full access" ON "Recall";

CREATE POLICY "Recall: select by linked report membership"
ON "Recall"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "Report" r
    JOIN "OrganizationMember" m ON m."organizationId" = r."organizationId"
    WHERE r."vehicleId" = "Recall"."vehicleId"
      AND m."userId" = (auth.uid())::text
  )
);

CREATE POLICY "Recall: service role full access"
ON "Recall"
FOR ALL
USING (auth.role() = 'service_role');

-- ─── JobQueue ─────────────────────────────────────────────────────────────────
-- JobQueue records are org-scoped. Only org members can read their own jobs.
-- All mutations happen server-side via service role only.

DROP POLICY IF EXISTS "JobQueue: select by org membership" ON "JobQueue";
DROP POLICY IF EXISTS "JobQueue: service role full access" ON "JobQueue";

CREATE POLICY "JobQueue: select by org membership"
ON "JobQueue"
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM "OrganizationMember" m
    WHERE m."organizationId" = "JobQueue"."orgId"
      AND m."userId" = (auth.uid())::text
  )
);

CREATE POLICY "JobQueue: service role full access"
ON "JobQueue"
FOR ALL
USING (auth.role() = 'service_role');
```
