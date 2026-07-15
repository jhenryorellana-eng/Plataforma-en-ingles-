-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ai";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "assessment";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "catalog";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "curriculum";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "family";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "learning";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "safety";

-- CreateEnum
CREATE TYPE "identity"."UserRole" AS ENUM ('learner', 'guardian', 'staff');

-- CreateEnum
CREATE TYPE "identity"."AgeBand" AS ENUM ('y12_13', 't14_17', 'a18_plus');

-- CreateEnum
CREATE TYPE "family"."LinkStatus" AS ENUM ('invited', 'active', 'revoked');

-- CreateEnum
CREATE TYPE "family"."ConsentPurpose" AS ENUM ('service', 'ai_voice', 'storage', 'international_transfer', 'analytics', 'marketing', 'research');

-- CreateEnum
CREATE TYPE "family"."ConsentStatus" AS ENUM ('granted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "catalog"."ProgramStatus" AS ENUM ('draft', 'active', 'retired');

-- CreateEnum
CREATE TYPE "catalog"."VersionStatus" AS ENUM ('draft', 'review', 'published', 'retired');

-- CreateEnum
CREATE TYPE "curriculum"."Skill" AS ENUM ('reading', 'listening', 'speaking', 'writing', 'language_use');

-- CreateEnum
CREATE TYPE "curriculum"."Criticality" AS ENUM ('critical', 'complementary');

-- CreateEnum
CREATE TYPE "curriculum"."ActivityKind" AS ENUM ('mcq', 'gap_fill', 'writing_prompt', 'voice_mission');

-- CreateEnum
CREATE TYPE "curriculum"."SupportLevel" AS ENUM ('guided', 'independent');

-- CreateEnum
CREATE TYPE "curriculum"."EdgeKind" AS ENUM ('requires', 'supports');

-- CreateEnum
CREATE TYPE "learning"."PaceCode" AS ENUM ('flex', 'accelerated', 'sprint');

-- CreateEnum
CREATE TYPE "learning"."EnrollmentStatus" AS ENUM ('pending_diagnostic', 'active', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "learning"."SessionStatus" AS ENUM ('created', 'active', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "learning"."EvidenceSource" AS ENUM ('practice', 'voice', 'checkpoint', 'diagnostic', 'exam_simulation');

-- CreateEnum
CREATE TYPE "learning"."CompetencyState" AS ENUM ('not_seen', 'exposed', 'developing', 'provisional', 'mastered', 'review_required');

-- CreateEnum
CREATE TYPE "assessment"."DiagnosticStatus" AS ENUM ('in_progress', 'completed', 'insufficient');

-- CreateEnum
CREATE TYPE "assessment"."ReviewCaseType" AS ENUM ('placement', 'stage_gate', 'integrity', 'readiness', 'certificate', 'low_confidence', 'appeal');

-- CreateEnum
CREATE TYPE "assessment"."ReviewStatus" AS ENUM ('pending', 'confirmed', 'corrected', 'invalidated');

-- CreateEnum
CREATE TYPE "ai"."VoiceMode" AS ENUM ('realtime', 'mock');

-- CreateEnum
CREATE TYPE "ai"."VoiceStatus" AS ENUM ('created', 'connected', 'completed', 'failed', 'terminated');

-- CreateEnum
CREATE TYPE "ai"."CostCenter" AS ENUM ('learning', 'assessment', 'safety', 'qa');

-- CreateEnum
CREATE TYPE "safety"."SignalSource" AS ENUM ('student_report', 'gateway', 'moderation');

-- CreateEnum
CREATE TYPE "safety"."SafetySeverity" AS ENUM ('p0', 'p1', 'p2', 'p3');

-- CreateEnum
CREATE TYPE "safety"."SafetyStatus" AS ENUM ('open', 'triaged', 'resolved');

-- CreateTable
CREATE TABLE "identity"."users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "role" "identity"."UserRole" NOT NULL,
    "ageBand" "identity"."AgeBand",
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family"."guardian_learner_links" (
    "id" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "status" "family"."LinkStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "guardian_learner_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family"."consent_grants" (
    "id" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "grantedById" UUID NOT NULL,
    "purpose" "family"."ConsentPurpose" NOT NULL,
    "status" "family"."ConsentStatus" NOT NULL DEFAULT 'granted',
    "noticeVersion" TEXT NOT NULL,
    "grantedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "consent_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family"."youth_assents" (
    "id" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youth_assents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."language_programs" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "defaultSupportLanguage" TEXT NOT NULL,
    "defaultInterfaceLocale" TEXT NOT NULL,
    "defaultTargetVariety" TEXT NOT NULL,
    "minimumAge" INTEGER NOT NULL,
    "status" "catalog"."ProgramStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "language_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."program_versions" (
    "id" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "engineMinVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "status" "catalog"."VersionStatus" NOT NULL DEFAULT 'draft',
    "contentHash" TEXT NOT NULL DEFAULT 'sha256:seed',
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog"."program_tracks" (
    "id" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qualificationTarget" TEXT,

    CONSTRAINT "program_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum"."stages" (
    "id" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cefrFrom" TEXT NOT NULL,
    "cefrTo" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum"."units" (
    "id" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum"."competencies" (
    "id" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "stageId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "descriptor" TEXT NOT NULL,
    "skill" "curriculum"."Skill" NOT NULL,
    "cefrLevel" TEXT NOT NULL,
    "criticality" "curriculum"."Criticality" NOT NULL,
    "globalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "dimensionFloors" JSONB NOT NULL DEFAULT '{}',
    "freshnessDays" INTEGER NOT NULL DEFAULT 45,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum"."competency_edges" (
    "id" UUID NOT NULL,
    "fromCompetencyId" UUID NOT NULL,
    "toCompetencyId" UUID NOT NULL,
    "kind" "curriculum"."EdgeKind" NOT NULL,

    CONSTRAINT "competency_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum"."rubric_versions" (
    "id" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "dimensions" JSONB NOT NULL,

    CONSTRAINT "rubric_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum"."lesson_contracts" (
    "id" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "mentorMode" TEXT NOT NULL DEFAULT 'tutor',
    "correctionPolicy" TEXT NOT NULL DEFAULT 'delayed_then_recast',
    "translationPolicy" TEXT NOT NULL DEFAULT 'on_request_only',
    "immersionRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "timeboxSeconds" INTEGER NOT NULL DEFAULT 900,
    "orderIndex" INTEGER NOT NULL,
    "evidenceRequirements" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "lesson_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum"."lesson_competencies" (
    "lessonContractId" UUID NOT NULL,
    "competencyId" UUID NOT NULL,

    CONSTRAINT "lesson_competencies_pkey" PRIMARY KEY ("lessonContractId","competencyId")
);

-- CreateTable
CREATE TABLE "curriculum"."activities" (
    "id" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "lessonContractId" UUID NOT NULL,
    "competencyId" UUID NOT NULL,
    "rubricVersionId" UUID,
    "code" TEXT NOT NULL,
    "kind" "curriculum"."ActivityKind" NOT NULL,
    "skill" "curriculum"."Skill" NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isTransferVariant" BOOLEAN NOT NULL DEFAULT false,
    "supportLevel" "curriculum"."SupportLevel" NOT NULL DEFAULT 'independent',
    "prompt" JSONB NOT NULL,
    "answerKey" JSONB NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning"."enrollments" (
    "id" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "programId" UUID NOT NULL,
    "programVersionId" UUID NOT NULL,
    "trackId" UUID,
    "paceCode" "learning"."PaceCode" NOT NULL,
    "supportLanguage" TEXT NOT NULL,
    "interfaceLocale" TEXT NOT NULL,
    "targetVariety" TEXT NOT NULL,
    "status" "learning"."EnrollmentStatus" NOT NULL DEFAULT 'pending_diagnostic',
    "placement" JSONB,
    "placementProvisional" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning"."entitlements" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "weeklyVoiceMinutes" INTEGER NOT NULL,
    "weeklyStudyHours" INTEGER NOT NULL,

    CONSTRAINT "entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning"."learning_sessions" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "lessonContractId" UUID NOT NULL,
    "status" "learning"."SessionStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(6),

    CONSTRAINT "learning_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning"."evidence" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "learningSessionId" UUID,
    "competencyId" UUID NOT NULL,
    "activityId" UUID,
    "rubricVersionId" UUID,
    "sourceType" "learning"."EvidenceSource" NOT NULL,
    "usedAids" BOOLEAN NOT NULL DEFAULT false,
    "isTransfer" BOOLEAN NOT NULL DEFAULT false,
    "isDelayedRetrieval" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION NOT NULL,
    "dimensionScores" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL,
    "alerts" JSONB,
    "normalizedPayload" JSONB NOT NULL,
    "provenance" JSONB NOT NULL,
    "inputHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning"."competency_states" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "competencyId" UUID NOT NULL,
    "state" "learning"."CompetencyState" NOT NULL DEFAULT 'not_seen',
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freshness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evidenceCount" INTEGER NOT NULL DEFAULT 0,
    "lastEvidenceAt" TIMESTAMPTZ(6),
    "nextReviewAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "competency_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning"."review_items" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "competencyId" UUID NOT NULL,
    "activityId" UUID,
    "dueAt" TIMESTAMPTZ(6) NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment"."diagnostic_items" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "skill" "curriculum"."Skill" NOT NULL,
    "level" TEXT NOT NULL,
    "prompt" JSONB NOT NULL,
    "answerKey" JSONB NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "diagnostic_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment"."diagnostic_attempts" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "status" "assessment"."DiagnosticStatus" NOT NULL DEFAULT 'in_progress',
    "result" JSONB,
    "startedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(6),

    CONSTRAINT "diagnostic_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment"."diagnostic_responses" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "itemCode" TEXT NOT NULL,
    "skill" "curriculum"."Skill" NOT NULL,
    "selectedIndex" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment"."human_reviews" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID,
    "learnerId" UUID NOT NULL,
    "caseType" "assessment"."ReviewCaseType" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "assessment"."ReviewStatus" NOT NULL DEFAULT 'pending',
    "decidedById" UUID,
    "decidedAt" TIMESTAMPTZ(6),
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "human_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai"."voice_sessions" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "lessonContractId" UUID NOT NULL,
    "mode" "ai"."VoiceMode" NOT NULL,
    "providerCallId" TEXT,
    "modelAlias" TEXT NOT NULL,
    "modelSnapshot" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "supportLanguage" TEXT NOT NULL,
    "targetVariety" TEXT NOT NULL,
    "immersionRatio" DOUBLE PRECISION NOT NULL,
    "status" "ai"."VoiceStatus" NOT NULL DEFAULT 'created',
    "startedAt" TIMESTAMPTZ(6),
    "endedAt" TIMESTAMPTZ(6),
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    "endReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai"."ai_usage_records" (
    "id" UUID NOT NULL,
    "enrollmentId" UUID,
    "voiceSessionId" UUID,
    "costCenter" "ai"."CostCenter" NOT NULL,
    "modelAlias" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "estimatedCostCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety"."safety_signals" (
    "id" UUID NOT NULL,
    "learnerId" UUID NOT NULL,
    "enrollmentId" UUID,
    "voiceSessionId" UUID,
    "source" "safety"."SignalSource" NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "safety"."SafetySeverity" NOT NULL,
    "excerptRedacted" TEXT,
    "status" "safety"."SafetyStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "safety"."safety_cases" (
    "id" UUID NOT NULL,
    "signalId" UUID NOT NULL,
    "assigneeId" UUID,
    "status" "safety"."SafetyStatus" NOT NULL DEFAULT 'open',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."outbox_events" (
    "sequenceId" BIGSERIAL NOT NULL,
    "eventId" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "publishedAt" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("sequenceId")
);

-- CreateTable
CREATE TABLE "audit"."audit_events" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "purpose" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."idempotency_records" (
    "key" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("key","route")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "identity"."users"("email");

-- CreateIndex
CREATE INDEX "guardian_learner_links_learnerId_status_idx" ON "family"."guardian_learner_links"("learnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "guardian_learner_links_guardianId_learnerId_key" ON "family"."guardian_learner_links"("guardianId", "learnerId");

-- CreateIndex
CREATE INDEX "consent_grants_learnerId_purpose_status_idx" ON "family"."consent_grants"("learnerId", "purpose", "status");

-- CreateIndex
CREATE INDEX "youth_assents_learnerId_idx" ON "family"."youth_assents"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "language_programs_code_key" ON "catalog"."language_programs"("code");

-- CreateIndex
CREATE INDEX "program_versions_programId_status_idx" ON "catalog"."program_versions"("programId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "program_versions_programId_version_key" ON "catalog"."program_versions"("programId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "program_versions_programId_id_key" ON "catalog"."program_versions"("programId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "program_tracks_programVersionId_code_key" ON "catalog"."program_tracks"("programVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "stages_programVersionId_code_key" ON "curriculum"."stages"("programVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "units_programVersionId_code_key" ON "curriculum"."units"("programVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "competencies_programVersionId_code_key" ON "curriculum"."competencies"("programVersionId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "competency_edges_fromCompetencyId_toCompetencyId_kind_key" ON "curriculum"."competency_edges"("fromCompetencyId", "toCompetencyId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "rubric_versions_programVersionId_code_version_key" ON "curriculum"."rubric_versions"("programVersionId", "code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_contracts_programVersionId_code_key" ON "curriculum"."lesson_contracts"("programVersionId", "code");

-- CreateIndex
CREATE INDEX "activities_lessonContractId_orderIndex_idx" ON "curriculum"."activities"("lessonContractId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "activities_programVersionId_code_key" ON "curriculum"."activities"("programVersionId", "code");

-- CreateIndex
CREATE INDEX "enrollments_learnerId_status_createdAt_idx" ON "learning"."enrollments"("learnerId", "status", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "entitlements_enrollmentId_key" ON "learning"."entitlements"("enrollmentId");

-- CreateIndex
CREATE INDEX "learning_sessions_enrollmentId_status_idx" ON "learning"."learning_sessions"("enrollmentId", "status");

-- CreateIndex
CREATE INDEX "evidence_enrollmentId_createdAt_idx" ON "learning"."evidence"("enrollmentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "evidence_enrollmentId_competencyId_createdAt_idx" ON "learning"."evidence"("enrollmentId", "competencyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "competency_states_enrollmentId_state_idx" ON "learning"."competency_states"("enrollmentId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "competency_states_enrollmentId_competencyId_key" ON "learning"."competency_states"("enrollmentId", "competencyId");

-- CreateIndex
CREATE INDEX "review_items_enrollmentId_dueAt_idx" ON "learning"."review_items"("enrollmentId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_items_code_key" ON "assessment"."diagnostic_items"("code");

-- CreateIndex
CREATE INDEX "diagnostic_attempts_enrollmentId_status_idx" ON "assessment"."diagnostic_attempts"("enrollmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_responses_attemptId_itemCode_key" ON "assessment"."diagnostic_responses"("attemptId", "itemCode");

-- CreateIndex
CREATE INDEX "human_reviews_status_createdAt_idx" ON "assessment"."human_reviews"("status", "createdAt");

-- CreateIndex
CREATE INDEX "voice_sessions_enrollmentId_createdAt_idx" ON "ai"."voice_sessions"("enrollmentId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ai_usage_records_enrollmentId_createdAt_idx" ON "ai"."ai_usage_records"("enrollmentId", "createdAt");

-- CreateIndex
CREATE INDEX "safety_signals_status_severity_createdAt_idx" ON "safety"."safety_signals"("status", "severity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "safety_cases_signalId_key" ON "safety"."safety_cases"("signalId");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_eventId_key" ON "audit"."outbox_events"("eventId");

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_sequenceId_idx" ON "audit"."outbox_events"("publishedAt", "sequenceId");

-- CreateIndex
CREATE INDEX "audit_events_objectType_objectId_createdAt_idx" ON "audit"."audit_events"("objectType", "objectId", "createdAt");

-- AddForeignKey
ALTER TABLE "family"."guardian_learner_links" ADD CONSTRAINT "guardian_learner_links_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family"."guardian_learner_links" ADD CONSTRAINT "guardian_learner_links_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family"."consent_grants" ADD CONSTRAINT "consent_grants_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family"."consent_grants" ADD CONSTRAINT "consent_grants_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family"."youth_assents" ADD CONSTRAINT "youth_assents_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."program_versions" ADD CONSTRAINT "program_versions_programId_fkey" FOREIGN KEY ("programId") REFERENCES "catalog"."language_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog"."program_tracks" ADD CONSTRAINT "program_tracks_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "catalog"."program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."stages" ADD CONSTRAINT "stages_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "catalog"."program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."units" ADD CONSTRAINT "units_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "catalog"."program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."units" ADD CONSTRAINT "units_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "curriculum"."stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."competencies" ADD CONSTRAINT "competencies_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "catalog"."program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."competencies" ADD CONSTRAINT "competencies_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "curriculum"."stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."competency_edges" ADD CONSTRAINT "competency_edges_fromCompetencyId_fkey" FOREIGN KEY ("fromCompetencyId") REFERENCES "curriculum"."competencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."competency_edges" ADD CONSTRAINT "competency_edges_toCompetencyId_fkey" FOREIGN KEY ("toCompetencyId") REFERENCES "curriculum"."competencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."rubric_versions" ADD CONSTRAINT "rubric_versions_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "catalog"."program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."lesson_contracts" ADD CONSTRAINT "lesson_contracts_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "catalog"."program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."lesson_contracts" ADD CONSTRAINT "lesson_contracts_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "curriculum"."units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."lesson_competencies" ADD CONSTRAINT "lesson_competencies_lessonContractId_fkey" FOREIGN KEY ("lessonContractId") REFERENCES "curriculum"."lesson_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."lesson_competencies" ADD CONSTRAINT "lesson_competencies_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "curriculum"."competencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."activities" ADD CONSTRAINT "activities_programVersionId_fkey" FOREIGN KEY ("programVersionId") REFERENCES "catalog"."program_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."activities" ADD CONSTRAINT "activities_lessonContractId_fkey" FOREIGN KEY ("lessonContractId") REFERENCES "curriculum"."lesson_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."activities" ADD CONSTRAINT "activities_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "curriculum"."competencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum"."activities" ADD CONSTRAINT "activities_rubricVersionId_fkey" FOREIGN KEY ("rubricVersionId") REFERENCES "curriculum"."rubric_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."enrollments" ADD CONSTRAINT "enrollments_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."enrollments" ADD CONSTRAINT "enrollments_programId_fkey" FOREIGN KEY ("programId") REFERENCES "catalog"."language_programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."enrollments" ADD CONSTRAINT "enrollments_programId_programVersionId_fkey" FOREIGN KEY ("programId", "programVersionId") REFERENCES "catalog"."program_versions"("programId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."enrollments" ADD CONSTRAINT "enrollments_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "catalog"."program_tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."entitlements" ADD CONSTRAINT "entitlements_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "learning"."enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."learning_sessions" ADD CONSTRAINT "learning_sessions_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "learning"."enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."learning_sessions" ADD CONSTRAINT "learning_sessions_lessonContractId_fkey" FOREIGN KEY ("lessonContractId") REFERENCES "curriculum"."lesson_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."evidence" ADD CONSTRAINT "evidence_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "learning"."enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."evidence" ADD CONSTRAINT "evidence_learningSessionId_fkey" FOREIGN KEY ("learningSessionId") REFERENCES "learning"."learning_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."evidence" ADD CONSTRAINT "evidence_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "curriculum"."competencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."evidence" ADD CONSTRAINT "evidence_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "curriculum"."activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."evidence" ADD CONSTRAINT "evidence_rubricVersionId_fkey" FOREIGN KEY ("rubricVersionId") REFERENCES "curriculum"."rubric_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."competency_states" ADD CONSTRAINT "competency_states_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "learning"."enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."competency_states" ADD CONSTRAINT "competency_states_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "curriculum"."competencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."review_items" ADD CONSTRAINT "review_items_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "learning"."enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."review_items" ADD CONSTRAINT "review_items_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "curriculum"."competencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning"."review_items" ADD CONSTRAINT "review_items_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "curriculum"."activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment"."diagnostic_attempts" ADD CONSTRAINT "diagnostic_attempts_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "learning"."enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment"."diagnostic_responses" ADD CONSTRAINT "diagnostic_responses_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "assessment"."diagnostic_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment"."human_reviews" ADD CONSTRAINT "human_reviews_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "learning"."enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment"."human_reviews" ADD CONSTRAINT "human_reviews_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment"."human_reviews" ADD CONSTRAINT "human_reviews_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "identity"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."voice_sessions" ADD CONSTRAINT "voice_sessions_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "learning"."enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."voice_sessions" ADD CONSTRAINT "voice_sessions_lessonContractId_fkey" FOREIGN KEY ("lessonContractId") REFERENCES "curriculum"."lesson_contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."ai_usage_records" ADD CONSTRAINT "ai_usage_records_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "learning"."enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai"."ai_usage_records" ADD CONSTRAINT "ai_usage_records_voiceSessionId_fkey" FOREIGN KEY ("voiceSessionId") REFERENCES "ai"."voice_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety"."safety_signals" ADD CONSTRAINT "safety_signals_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "identity"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "safety"."safety_cases" ADD CONSTRAINT "safety_cases_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "safety"."safety_signals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
