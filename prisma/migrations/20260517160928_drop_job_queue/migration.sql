-- DropForeignKey
ALTER TABLE "JobQueue" DROP CONSTRAINT "JobQueue_reportId_fkey";

-- DropTable
DROP TABLE "JobQueue";

-- DropEnum
DROP TYPE "JobStatus";
