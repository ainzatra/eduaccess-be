/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('male', 'female', 'other');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "gender" "public"."Gender",
ADD COLUMN     "nickname" TEXT,
ADD COLUMN     "username" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."Guardian" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_email_key" ON "public"."Guardian"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_student_id_key" ON "public"."Guardian"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- AddForeignKey
ALTER TABLE "public"."Guardian" ADD CONSTRAINT "Guardian_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
