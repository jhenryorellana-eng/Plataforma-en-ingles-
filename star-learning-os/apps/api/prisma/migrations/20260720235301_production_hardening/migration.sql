-- CreateEnum
CREATE TYPE "identity"."StaffCapability" AS ENUM ('curriculum_author', 'curriculum_publisher', 'academic_reviewer', 'safeguarding', 'operations');

-- AlterTable
ALTER TABLE "ai"."voice_sessions" ADD COLUMN     "lastHeartbeatAt" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "identity"."auth_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."staff_grants" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "capability" "identity"."StaffCapability" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "identity"."auth_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_revokedAt_idx" ON "identity"."auth_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "identity"."auth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "staff_grants_capability_userId_idx" ON "identity"."staff_grants"("capability", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_grants_userId_capability_key" ON "identity"."staff_grants"("userId", "capability");

-- CreateIndex
CREATE INDEX "safety_cases_assigneeId_status_idx" ON "safety"."safety_cases"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "safety_signals_enrollmentId_idx" ON "safety"."safety_signals"("enrollmentId");

-- CreateIndex
CREATE INDEX "safety_signals_voiceSessionId_idx" ON "safety"."safety_signals"("voiceSessionId");

-- AddForeignKey
ALTER TABLE "identity"."auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."staff_grants" ADD CONSTRAINT "staff_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety"."safety_signals" ADD CONSTRAINT "safety_signals_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "learning"."enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety"."safety_signals" ADD CONSTRAINT "safety_signals_voiceSessionId_fkey" FOREIGN KEY ("voiceSessionId") REFERENCES "ai"."voice_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety"."safety_cases" ADD CONSTRAINT "safety_cases_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Existing staff retain access after the capability model is introduced.
-- Production can then revoke individual grants to enforce least privilege.
INSERT INTO "identity"."staff_grants" ("id", "userId", "capability", "createdAt")
SELECT gen_random_uuid(), u."id", capability, CURRENT_TIMESTAMP
FROM "identity"."users" u
CROSS JOIN unnest(ARRAY[
  'curriculum_author'::"identity"."StaffCapability",
  'curriculum_publisher'::"identity"."StaffCapability",
  'academic_reviewer'::"identity"."StaffCapability",
  'safeguarding'::"identity"."StaffCapability",
  'operations'::"identity"."StaffCapability"
]) AS capability
WHERE u."role" = 'staff'
ON CONFLICT ("userId", "capability") DO NOTHING;

-- Defensa en profundidad: estas tablas son exclusivamente server-side.
ALTER TABLE "identity"."auth_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "identity"."staff_grants" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE "identity"."auth_sessions", "identity"."staff_grants" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "identity"."auth_sessions", "identity"."staff_grants" FROM authenticated;
  END IF;
END $$;
