-- AlterTable
ALTER TABLE "public"."Activity" ADD COLUMN     "school_year" TEXT NOT NULL DEFAULT '2025-2026';

-- AlterTable
ALTER TABLE "public"."Announcement" ADD COLUMN     "school_year" TEXT NOT NULL DEFAULT '2025-2026';

-- AlterTable
ALTER TABLE "public"."LearningMaterial" ADD COLUMN     "school_year" TEXT NOT NULL DEFAULT '2025-2026';

-- AlterTable
ALTER TABLE "public"."Lesson" ADD COLUMN     "school_year" TEXT NOT NULL DEFAULT '2025-2026';

-- AlterTable
ALTER TABLE "public"."Notification" ADD COLUMN     "school_year" TEXT NOT NULL DEFAULT '2025-2026';

-- AlterTable
ALTER TABLE "public"."Subject" ADD COLUMN     "school_year" TEXT NOT NULL DEFAULT '2025-2026';

-- AlterTable
ALTER TABLE "public"."Todo" ADD COLUMN     "school_year" TEXT NOT NULL DEFAULT '2025-2026';

-- CreateTable
CREATE TABLE "public"."SchoolYear" (
    "id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolYear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SchoolYear_year_key" ON "public"."SchoolYear"("year");
