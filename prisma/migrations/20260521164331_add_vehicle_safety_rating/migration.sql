-- CreateTable
CREATE TABLE "VehicleSafetyRating" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "nhtsaVehicleId" INTEGER,
    "vehicleDescription" TEXT,
    "overallRating" TEXT,
    "overallFrontCrashRating" TEXT,
    "overallSideCrashRating" TEXT,
    "rolloverRating" TEXT,
    "frontCrashDriversideRating" TEXT,
    "frontCrashPassengersideRating" TEXT,
    "sideCrashDriversideRating" TEXT,
    "sideCrashPassengersideRating" TEXT,
    "sidePoleCrashRating" TEXT,
    "rolloverPossibility" DOUBLE PRECISION,
    "dynamicTipResult" TEXT,
    "nhtsaElectronicStabilityControl" TEXT,
    "nhtsaForwardCollisionWarning" TEXT,
    "nhtsaLaneDepartureWarning" TEXT,
    "complaintsCount" INTEGER,
    "investigationCount" INTEGER,
    "frontCrashPicture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleSafetyRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehicleSafetyRating_vehicleId_key" ON "VehicleSafetyRating"("vehicleId");

-- CreateIndex
CREATE INDEX "VehicleSafetyRating_nhtsaVehicleId_idx" ON "VehicleSafetyRating"("nhtsaVehicleId");

-- AddForeignKey
ALTER TABLE "VehicleSafetyRating" ADD CONSTRAINT "VehicleSafetyRating_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
