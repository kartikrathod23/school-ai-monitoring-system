-- CreateEnum
CREATE TYPE "GeofenceValidationType" AS ENUM ('ATTENDANCE', 'FACE_ONBOARDING', 'MEAL_COUNT');

-- CreateTable
CREATE TABLE "GeofenceValidation" (
    "id" TEXT NOT NULL,
    "teacherUserId" TEXT NOT NULL,
    "validationType" "GeofenceValidationType" NOT NULL,
    "referenceId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "isWithinGeofence" BOOLEAN NOT NULL,
    "schoolId" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeofenceValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeofenceValidation_teacherUserId_idx" ON "GeofenceValidation"("teacherUserId");

-- CreateIndex
CREATE INDEX "GeofenceValidation_validationType_idx" ON "GeofenceValidation"("validationType");

-- CreateIndex
CREATE INDEX "GeofenceValidation_referenceId_idx" ON "GeofenceValidation"("referenceId");

-- AddForeignKey
ALTER TABLE "GeofenceValidation" ADD CONSTRAINT "GeofenceValidation_teacherUserId_fkey" FOREIGN KEY ("teacherUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceValidation" ADD CONSTRAINT "GeofenceValidation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
