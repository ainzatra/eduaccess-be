-- CreateTable
CREATE TABLE "public"."LessonImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lesson_id" TEXT NOT NULL,

    CONSTRAINT "LessonImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."LessonImage" ADD CONSTRAINT "LessonImage_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
