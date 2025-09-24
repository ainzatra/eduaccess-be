-- DropForeignKey
ALTER TABLE "public"."Section" DROP CONSTRAINT "Section_teacher_id_fkey";

-- AlterTable
ALTER TABLE "public"."Section" ALTER COLUMN "teacher_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Section" ADD CONSTRAINT "Section_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
