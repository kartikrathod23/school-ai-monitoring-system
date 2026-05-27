-- DropForeignKey
ALTER TABLE "MlProcessingJob" DROP CONSTRAINT "MlProcessingJob_onboardingSessionId_fkey";

-- AlterTable
ALTER TABLE "MlProcessingJob" ADD COLUMN     "attendanceSessionId" TEXT,
ADD COLUMN     "mealSessionId" TEXT,
ALTER COLUMN "onboardingSessionId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AttendanceImage" (
    "id" TEXT NOT NULL,
    "attendanceSessionId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AttendanceImage" ADD CONSTRAINT "AttendanceImage_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MlProcessingJob" ADD CONSTRAINT "MlProcessingJob_onboardingSessionId_fkey" FOREIGN KEY ("onboardingSessionId") REFERENCES "FaceOnboardingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MlProcessingJob" ADD CONSTRAINT "MlProcessingJob_attendanceSessionId_fkey" FOREIGN KEY ("attendanceSessionId") REFERENCES "AttendanceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MlProcessingJob" ADD CONSTRAINT "MlProcessingJob_mealSessionId_fkey" FOREIGN KEY ("mealSessionId") REFERENCES "MealSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
