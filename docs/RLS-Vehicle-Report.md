# RLS Policies for `Vehicle` and `Report`

This file adds Row Level Security for the new AutoVinScout tables:

- `public."Vehicle"`
- `public."Report"`

## Design Notes

- `Report` is tenant-scoped by `organizationId`, so org members can read reports that belong to their org.
- `Vehicle` is a shared canonical VIN table and does **not** contain `organizationId`.
- Because `Vehicle` rows may be shared across multiple orgs, direct client writes are risky.
- For that reason:
  - authenticated org members get `SELECT`
  - writes stay backend-only via `service_role`

## SQL

Run this in the Supabase SQL Editor after the Prisma migration has created the tables.

```sql
-- ========================================================
-- ENABLE RLS
-- ========================================================
ALTER TABLE public."Vehicle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Report" ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- VEHICLE TABLE
-- Canonical VIN records shared across tenants.
-- Read access is granted only when the user belongs to an
-- organization that has at least one report linked to the vehicle.
-- Writes are restricted to service_role because Vehicle has no
-- organizationId and can be shared across orgs.
-- ========================================================

DROP POLICY IF EXISTS "Vehicle: select by linked report membership" ON public."Vehicle";
CREATE POLICY "Vehicle: select by linked report membership" ON public."Vehicle"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public."Report" r
      JOIN public."OrganizationMember" m
        ON m."organizationId" = r."organizationId"
      WHERE r."vehicleId" = public."Vehicle".id
        AND m."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Vehicle: service role full access" ON public."Vehicle";
CREATE POLICY "Vehicle: service role full access" ON public."Vehicle"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ========================================================
-- REPORT TABLE
-- Tenant-scoped by organizationId.
-- Org members can read reports in their org.
-- Writes are backend-only because report creation and updates
-- happen through protected server workflows and background jobs.
-- ========================================================

DROP POLICY IF EXISTS "Report: select by org membership" ON public."Report";
CREATE POLICY "Report: select by org membership" ON public."Report"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public."OrganizationMember" m
      WHERE m."organizationId" = public."Report"."organizationId"
        AND m."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "Report: service role full access" ON public."Report";
CREATE POLICY "Report: service role full access" ON public."Report"
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

## Optional Future Tightening

If you later move report writes to direct client-side Supabase calls instead of server-side oRPC procedures, you can add narrower policies such as:

- `INSERT` on `Report` for org members with `WITH CHECK`
- `DELETE` on `Report` for `OWNER` or `ADMIN`
- no direct `INSERT/UPDATE/DELETE` on `Vehicle` unless you add a tenant ownership model