-- Add autoRenewOnCreditExhaust flag to User
ALTER TABLE "User" ADD COLUMN "autoRenewOnCreditExhaust" BOOLEAN NOT NULL DEFAULT false;
