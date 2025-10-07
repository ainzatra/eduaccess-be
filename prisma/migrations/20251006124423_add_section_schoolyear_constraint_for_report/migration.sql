/*
  Warnings:

  - You are about to drop the column `content` on the `NarrativeReport` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[student_id,section_id,schoolYear]` on the table `NarrativeReport` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schoolYear` to the `NarrativeReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `section_id` to the `NarrativeReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `NarrativeReport` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."NarrativeReport" DROP COLUMN "content",
ADD COLUMN     "schoolYear" TEXT NOT NULL,
ADD COLUMN     "section_id" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "NarrativeReport_student_id_section_id_schoolYear_key" ON "public"."NarrativeReport"("student_id", "section_id", "schoolYear");

-- AddForeignKey
ALTER TABLE "public"."NarrativeReport" ADD CONSTRAINT "NarrativeReport_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
