-- CreateEnum
CREATE TYPE "FaceOnboardingSessionStatus" AS ENUM ('PENDING', 'IMAGES_CAPTURED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MlJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "StudentFaceImage" ADD COLUMN     "onboardingSessionId" TEXT;

-- CreateTable
CREATE TABLE "FaceOnboardingSession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "status" "FaceOnboardingSessionStatus" NOT NULL DEFAULT 'PENDING',
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceOnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MlProcessingJob" (
    "id" TEXT NOT NULL,
    "onboardingSessionId" TEXT NOT NULL,
    "status" "MlJobStatus" NOT NULL DEFAULT 'PENDING',
    "jobType" TEXT NOT NULL,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MlProcessingJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StudentFaceImage" ADD CONSTRAINT "StudentFaceImage_onboardingSessionId_fkey" FOREIGN KEY ("onboardingSessionId") REFERENCES "FaceOnboardingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOnboardingSession" ADD CONSTRAINT "FaceOnboardingSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOnboardingSession" ADD CONSTRAINT "FaceOnboardingSession_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceOnboardingSession" ADD CONSTRAINT "FaceOnboardingSession_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MlProcessingJob" ADD CONSTRAINT "MlProcessingJob_onboardingSessionId_fkey" FOREIGN KEY ("onboardingSessionId") REFERENCES "FaceOnboardingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
