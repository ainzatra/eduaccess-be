-- AlterTable
ALTER TABLE "public"."ActivitySubmission" ADD COLUMN     "previousProgressPoints" INTEGER,
ADD COLUMN     "progressPoints" INTEGER;

-- CreateTable
CREATE TABLE "public"."ProgressLevel" (
    "id" TEXT NOT NULL,
    "level" "public"."ActivityLevel" NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "maxPoints" INTEGER NOT NULL,
    "pointValue" INTEGER NOT NULL,
    "schoolYear" TEXT NOT NULL DEFAULT '2025-2026',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "currentLevel" "public"."ActivityLevel" NOT NULL DEFAULT 'beginner',
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "schoolYear" TEXT NOT NULL DEFAULT '2025-2026',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgressLevel_level_schoolYear_key" ON "public"."ProgressLevel"("level", "schoolYear");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProgress_studentId_subjectId_schoolYear_key" ON "public"."StudentProgress"("studentId", "subjectId", "schoolYear");

-- AddForeignKey
ALTER TABLE "public"."StudentProgress" ADD CONSTRAINT "StudentProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentProgress" ADD CONSTRAINT "StudentProgress_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
