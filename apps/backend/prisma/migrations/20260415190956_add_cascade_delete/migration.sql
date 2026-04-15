-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_standardId_fkey";

-- DropForeignKey
ALTER TABLE "Standard" DROP CONSTRAINT "Standard_schoolId_fkey";

-- AddForeignKey
ALTER TABLE "Standard" ADD CONSTRAINT "Standard_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "Standard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
