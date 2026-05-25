/*
  Warnings:

  - Changed the type of `jobType` on the `MlProcessingJob` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MlJobType" AS ENUM ('FACE_EMBEDDING_GENERATION', 'ATTENDANCE_PROCESSING', 'MEAL_COUNT_PROCESSING');

-- AlterTable
ALTER TABLE "MlProcessingJob"
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "startedAt" TIMESTAMP(3);

ALTER TABLE "MlProcessingJob"
ALTER COLUMN "jobType" TYPE "MlJobType"
USING ("jobType"::text::"MlJobType");

-- AlterTable
ALTER TABLE "StudentFaceImage" ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT;

-- CreateTable
CREATE TABLE "StudentFaceEmbedding" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "embedding" JSONB NOT NULL,
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentFaceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentFaceEmbedding_studentId_idx" ON "StudentFaceEmbedding"("studentId");

-- AddForeignKey
ALTER TABLE "StudentFaceEmbedding" ADD CONSTRAINT "StudentFaceEmbedding_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
