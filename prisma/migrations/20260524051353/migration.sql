/*
  Warnings:

  - You are about to drop the column `engine` on the `Vehicle` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Vehicle" DROP COLUMN "engine",
ADD COLUMN     "engineDesc" TEXT;
