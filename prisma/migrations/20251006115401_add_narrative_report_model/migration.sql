-- AlterTable
ALTER TABLE "public"."Section" ADD COLUMN     "school_year" TEXT DEFAULT '2025-2026';

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "birthday" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."NarrativeReport" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_id" TEXT NOT NULL,
    "behavior" JSONB NOT NULL,
    "speechAndLanguage" JSONB NOT NULL,
    "fineMotor" JSONB NOT NULL,
    "grossMotor" JSONB NOT NULL,
    "activitiesForDailyLivingSkills" JSONB NOT NULL,
    "cognitive" JSONB NOT NULL,
    "areasForDevelopment" JSONB NOT NULL,
    "strategies" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "conclusion" TEXT NOT NULL,

    CONSTRAINT "NarrativeReport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."NarrativeReport" ADD CONSTRAINT "NarrativeReport_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
