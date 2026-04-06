/*
  Warnings:

  - You are about to drop the column `userId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `credits` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `creditsReminderThresholdSent` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastFreeRefillAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastPaygPurchaseAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `stripeCustomerId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropIndex
DROP INDEX "Subscription_userId_key";

-- DropIndex
DROP INDEX "User_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "userId" CASCADE;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "credits",
DROP COLUMN "creditsReminderThresholdSent",
DROP COLUMN "lastFreeRefillAt",
DROP COLUMN "lastPaygPurchaseAt",
DROP COLUMN "stripeCustomerId";
