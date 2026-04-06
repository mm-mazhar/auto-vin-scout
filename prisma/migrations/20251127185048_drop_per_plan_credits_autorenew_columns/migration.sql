/*
  Warnings:

  - You are about to drop the column `autoRenewPayg` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `autoRenewPro` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `freeCr` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `paygCr` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `proCr` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "autoRenewPayg",
DROP COLUMN "autoRenewPro",
DROP COLUMN "freeCr",
DROP COLUMN "paygCr",
DROP COLUMN "proCr";
