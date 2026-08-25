-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('FUN', 'EDUCATIONAL', 'DREAM_JOB');

-- AlterTable
ALTER TABLE "StorybookTemplate" ADD COLUMN     "category" "TemplateCategory" NOT NULL DEFAULT 'FUN';
