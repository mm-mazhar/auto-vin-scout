BEGIN;

TRUNCATE TABLE
  public."OrganizationInvite",
  public."Project",
  public."OrganizationMember",
  public."Subscription",
  public."Organization",
  public."User",
  public."Report",
  public."Vehicle",
  public."Recall",
  public."RiskVectorResult",
  public."VehicleListingHistory",
  public."VehicleSafetyRating",
  public."VehicleSafetyRating"
RESTART IDENTITY CASCADE;

TRUNCATE TABLE auth.users CASCADE;

COMMIT;