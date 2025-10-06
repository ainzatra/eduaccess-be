/*
  Warnings:

  - A unique constraint covering the columns `[activity_id,student_id,version]` on the table `ActivitySubmission` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."ActivitySubmission" ADD COLUMN     "is_latest" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "previous_submission_id" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "public"."ActivityRetakePermission" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activity_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "ActivityRetakePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityRetakePermission_activity_id_student_id_key" ON "public"."ActivityRetakePermission"("activity_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "ActivitySubmission_activity_id_student_id_version_key" ON "public"."ActivitySubmission"("activity_id", "student_id", "version");

-- AddForeignKey
ALTER TABLE "public"."ActivitySubmission" ADD CONSTRAINT "ActivitySubmission_previous_submission_id_fkey" FOREIGN KEY ("previous_submission_id") REFERENCES "public"."ActivitySubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityRetakePermission" ADD CONSTRAINT "ActivityRetakePermission_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityRetakePermission" ADD CONSTRAINT "ActivityRetakePermission_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
