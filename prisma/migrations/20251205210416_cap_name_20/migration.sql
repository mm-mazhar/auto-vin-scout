/*
  Warnings:

  - You are about to alter the column `name` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `name` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.

*/
-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "name" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "name" SET DATA TYPE VARCHAR(20);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "colorScheme" SET DEFAULT 'theme-neutral';
