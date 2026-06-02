-- AlterEnum
ALTER TYPE "MealSessionStatus" ADD VALUE 'PROCESSED';

-- CreateTable
CREATE TABLE "MealImage" (
    "id" TEXT NOT NULL,
    "mealSessionId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MealImage" ADD CONSTRAINT "MealImage_mealSessionId_fkey" FOREIGN KEY ("mealSessionId") REFERENCES "MealSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
