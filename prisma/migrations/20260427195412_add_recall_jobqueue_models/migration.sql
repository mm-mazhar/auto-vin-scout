/*
  Warnings:

  - You are about to drop the column `recallData` on the `Report` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "recallData";

-- CreateTable
CREATE TABLE "Recall" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "campaignNumber" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "consequence" TEXT NOT NULL,
    "remedy" TEXT NOT NULL,
    "notes" TEXT,
    "parkIt" BOOLEAN NOT NULL DEFAULT false,
    "parkOutSide" BOOLEAN NOT NULL DEFAULT false,
    "overTheAirUpdate" BOOLEAN NOT NULL DEFAULT false,
    "reportReceivedDate" TIMESTAMP(3),
    "manufacturer" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobQueue" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "JobQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Recall_campaignNumber_key" ON "Recall"("campaignNumber");

-- CreateIndex
CREATE INDEX "Recall_vehicleId_idx" ON "Recall"("vehicleId");

-- CreateIndex
CREATE INDEX "Recall_campaignNumber_idx" ON "Recall"("campaignNumber");

-- CreateIndex
CREATE UNIQUE INDEX "JobQueue_reportId_key" ON "JobQueue"("reportId");

-- CreateIndex
CREATE INDEX "JobQueue_orgId_status_idx" ON "JobQueue"("orgId", "status");

-- CreateIndex
CREATE INDEX "JobQueue_status_createdAt_idx" ON "JobQueue"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Recall" ADD CONSTRAINT "Recall_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobQueue" ADD CONSTRAINT "JobQueue_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
