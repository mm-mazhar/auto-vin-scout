-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "bodySubtype" TEXT,
ADD COLUMN     "cityMpg" DOUBLE PRECISION,
ADD COLUMN     "cylinders" INTEGER,
ADD COLUMN     "decoderSource" TEXT NOT NULL DEFAULT 'NHTSA',
ADD COLUMN     "doors" INTEGER,
ADD COLUMN     "engineSize" DOUBLE PRECISION,
ADD COLUMN     "highwayMpg" DOUBLE PRECISION,
ADD COLUMN     "overallHeight" DOUBLE PRECISION,
ADD COLUMN     "overallLength" DOUBLE PRECISION,
ADD COLUMN     "overallWidth" DOUBLE PRECISION,
ADD COLUMN     "powertrainType" TEXT,
ADD COLUMN     "stdSeating" INTEGER,
ADD COLUMN     "transmission" TEXT;

-- CreateIndex
CREATE INDEX "Vehicle_decoderSource_idx" ON "Vehicle"("decoderSource");

-- Add check constraints for numeric field ranges
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_doors_check" 
  CHECK ("doors" IS NULL OR ("doors" >= 1 AND "doors" <= 10));

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_cylinders_check" 
  CHECK ("cylinders" IS NULL OR ("cylinders" >= 1 AND "cylinders" <= 16));

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_stdSeating_check" 
  CHECK ("stdSeating" IS NULL OR ("stdSeating" >= 1 AND "stdSeating" <= 20));
