-- CreateEnum
CREATE TYPE "family"."InvitationStatus" AS ENUM ('pending', 'accepted', 'expired');

-- CreateEnum
CREATE TYPE "assessment"."DiagnosticStage" AS ENUM ('router', 'module', 'writing');

-- AlterTable
ALTER TABLE "assessment"."diagnostic_items" ADD COLUMN     "stage" "assessment"."DiagnosticStage" NOT NULL DEFAULT 'router';

-- AlterTable
ALTER TABLE "assessment"."diagnostic_responses" ADD COLUMN     "score" DOUBLE PRECISION,
ADD COLUMN     "textResponse" TEXT,
ALTER COLUMN "selectedIndex" DROP NOT NULL,
ALTER COLUMN "correct" DROP NOT NULL;

-- CreateTable
CREATE TABLE "family"."guardian_invitations" (
    "id" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "guardianEmail" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "family"."InvitationStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMPTZ(6),

    CONSTRAINT "guardian_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guardian_invitations_code_key" ON "family"."guardian_invitations"("code");

-- CreateIndex
CREATE INDEX "guardian_invitations_learnerId_status_idx" ON "family"."guardian_invitations"("learnerId", "status");

-- CreateIndex
CREATE INDEX "diagnostic_items_stage_level_idx" ON "assessment"."diagnostic_items"("stage", "level");

-- AddForeignKey
ALTER TABLE "family"."guardian_invitations" ADD CONSTRAINT "guardian_invitations_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
