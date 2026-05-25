/*
  Warnings:

  - You are about to drop the column `name` on the `Standard` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[schoolId,value]` on the table `Standard` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `value` to the `Standard` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Standard_schoolId_name_key";

-- AlterTable
ALTER TABLE "Standard" DROP COLUMN "name",
ADD COLUMN     "value" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Standard_schoolId_value_key" ON "Standard"("schoolId", "value");
