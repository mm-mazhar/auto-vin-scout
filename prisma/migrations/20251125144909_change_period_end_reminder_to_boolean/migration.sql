/*
  Warnings:

  - You are about to drop the column `periodEndReminderSentFor` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "periodEndReminderSentFor",
ADD COLUMN     "periodEndReminderSent" BOOLEAN NOT NULL DEFAULT false;
