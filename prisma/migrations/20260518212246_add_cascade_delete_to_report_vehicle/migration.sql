-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_vehicleId_fkey";

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
