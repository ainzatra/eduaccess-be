/*
  Warnings:

  - The `condition` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."Condition" AS ENUM ('deaf', 'speech_delay');

-- AlterTable
ALTER TABLE "public"."Activity" ADD COLUMN     "category" "public"."Condition" NOT NULL DEFAULT 'deaf';

-- AlterTable
ALTER TABLE "public"."Subject" ADD COLUMN     "category" "public"."Condition" NOT NULL DEFAULT 'deaf';

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "condition",
ADD COLUMN     "condition" "public"."Condition" NOT NULL DEFAULT 'deaf';
