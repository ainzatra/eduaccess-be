/*
  Warnings:

  - You are about to drop the column `schema` on the `Activity` table. All the data in the column will be lost.
  - Added the required column `questions` to the `Activity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Activity" DROP COLUMN "schema",
ADD COLUMN     "questions" TEXT NOT NULL;
