-- CreateEnum
CREATE TYPE "public"."SubmissionStatus" AS ENUM ('graded', 'pending');

-- AlterTable
ALTER TABLE "public"."ActivitySubmission" ADD COLUMN     "status" "public"."SubmissionStatus" NOT NULL DEFAULT 'pending';
