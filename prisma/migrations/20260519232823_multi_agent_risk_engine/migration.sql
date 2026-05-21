-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "executiveSummary" TEXT,
ADD COLUMN     "negotiationScript" TEXT;

-- CreateTable
CREATE TABLE "VehicleListingHistory" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "externalListingId" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "miles" INTEGER,
    "msrp" DOUBLE PRECISION,
    "sellerType" TEXT,
    "inventoryType" TEXT,
    "isCertified" BOOLEAN,
    "exteriorColor" TEXT,
    "interiorColor" TEXT,
    "dom" INTEGER,
    "statusDate" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "sellerName" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "source" TEXT,
    "vdpUrl" TEXT,
    "dataSource" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleListingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskVectorResult" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "vectorIndex" INTEGER NOT NULL,
    "vectorName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "narrative" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskVectorResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleListingHistory_vehicleId_idx" ON "VehicleListingHistory"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleListingHistory_statusDate_idx" ON "VehicleListingHistory"("statusDate");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleListingHistory_vehicleId_externalListingId_key" ON "VehicleListingHistory"("vehicleId", "externalListingId");

-- CreateIndex
CREATE INDEX "RiskVectorResult_reportId_idx" ON "RiskVectorResult"("reportId");

-- CreateIndex
CREATE INDEX "RiskVectorResult_vectorIndex_idx" ON "RiskVectorResult"("vectorIndex");

-- AddForeignKey
ALTER TABLE "VehicleListingHistory" ADD CONSTRAINT "VehicleListingHistory_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskVectorResult" ADD CONSTRAINT "RiskVectorResult_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
