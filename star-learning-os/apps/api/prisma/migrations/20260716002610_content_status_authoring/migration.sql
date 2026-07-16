-- CreateEnum
CREATE TYPE "curriculum"."ContentStatus" AS ENUM ('draft', 'published', 'retired');

-- AlterTable
ALTER TABLE "curriculum"."lesson_contracts" ADD COLUMN     "createdBy" TEXT NOT NULL DEFAULT 'seed',
ADD COLUMN     "sourceTopic" TEXT,
ADD COLUMN     "status" "curriculum"."ContentStatus" NOT NULL DEFAULT 'published';
