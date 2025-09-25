/*
  Warnings:

  - Added the required column `activity_id` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subject_id` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('new_activity', 'new_submission', 'activity_graded');

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "activity_id" TEXT NOT NULL,
ADD COLUMN     "subject_id" TEXT NOT NULL,
ADD COLUMN     "type" "public"."NotificationType" NOT NULL DEFAULT 'new_activity';
