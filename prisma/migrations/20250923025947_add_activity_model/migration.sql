-- CreateEnum
CREATE TYPE "public"."ActivityLevel" AS ENUM ('beginner', 'intermediate', 'advance');

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleAudio" TEXT,
    "instructions" TEXT NOT NULL,
    "instructionsAudio" TEXT,
    "schema" TEXT NOT NULL,
    "level" "public"."ActivityLevel" NOT NULL,
    "graded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "subject_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
