-- AlterTable
ALTER TABLE "public"."LearningMaterial" ALTER COLUMN "url" DROP NOT NULL,
ALTER COLUMN "s3_key" DROP NOT NULL;
