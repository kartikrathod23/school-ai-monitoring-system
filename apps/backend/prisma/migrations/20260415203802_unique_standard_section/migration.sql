/*
  Warnings:

  - A unique constraint covering the columns `[standardId,name]` on the table `Section` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,name]` on the table `Standard` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Section_standardId_name_key" ON "Section"("standardId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Standard_schoolId_name_key" ON "Standard"("schoolId", "name");
