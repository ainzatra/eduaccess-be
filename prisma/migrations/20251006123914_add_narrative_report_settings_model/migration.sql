-- CreateTable
CREATE TABLE "public"."NarrativeReportSettings" (
    "id" TEXT NOT NULL,
    "principal" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NarrativeReportSettings_pkey" PRIMARY KEY ("id")
);
