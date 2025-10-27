/*
  Warnings:

  - You are about to drop the column `subtitle_url` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `video_url` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the `LessonImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."MaterialType" AS ENUM ('video', 'image', 'subtitle');

-- DropForeignKey
ALTER TABLE "public"."LessonImage" DROP CONSTRAINT "LessonImage_lesson_id_fkey";

-- AlterTable
ALTER TABLE "public"."Lesson" DROP COLUMN "subtitle_url",
DROP COLUMN "video_url";

-- DropTable
DROP TABLE "public"."LessonImage";

-- CreateTable
CREATE TABLE "public"."LearningMaterial" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."MaterialType" NOT NULL,
    "url" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "LearningMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LessonMaterial" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lesson_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,

    CONSTRAINT "LessonMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonMaterial_lesson_id_material_id_key" ON "public"."LessonMaterial"("lesson_id", "material_id");

-- AddForeignKey
ALTER TABLE "public"."LearningMaterial" ADD CONSTRAINT "LearningMaterial_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonMaterial" ADD CONSTRAINT "LessonMaterial_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonMaterial" ADD CONSTRAINT "LessonMaterial_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."LearningMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
