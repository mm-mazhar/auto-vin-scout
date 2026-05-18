-- DropForeignKey
ALTER TABLE "Recall" DROP CONSTRAINT "Recall_vehicleId_fkey";

-- AddForeignKey
ALTER TABLE "Recall" ADD CONSTRAINT "Recall_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
