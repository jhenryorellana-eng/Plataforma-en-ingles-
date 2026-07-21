-- Prisma does not wrap PostgreSQL migrations automatically. Keep the index and
-- privilege hardening atomic so a failed statement cannot leave a partial
-- production state recorded outside the migration ledger.
BEGIN;

-- CreateIndex
CREATE INDEX "ai_usage_records_voiceSessionId_idx" ON "ai"."ai_usage_records"("voiceSessionId");

-- CreateIndex
CREATE INDEX "voice_sessions_lessonContractId_idx" ON "ai"."voice_sessions"("lessonContractId");

-- CreateIndex
CREATE INDEX "human_reviews_enrollmentId_idx" ON "assessment"."human_reviews"("enrollmentId");

-- CreateIndex
CREATE INDEX "human_reviews_learnerId_idx" ON "assessment"."human_reviews"("learnerId");

-- CreateIndex
CREATE INDEX "human_reviews_decidedById_idx" ON "assessment"."human_reviews"("decidedById");

-- CreateIndex
CREATE INDEX "activities_competencyId_idx" ON "curriculum"."activities"("competencyId");

-- CreateIndex
CREATE INDEX "activities_rubricVersionId_idx" ON "curriculum"."activities"("rubricVersionId");

-- CreateIndex
CREATE INDEX "competencies_stageId_idx" ON "curriculum"."competencies"("stageId");

-- CreateIndex
CREATE INDEX "competency_edges_toCompetencyId_idx" ON "curriculum"."competency_edges"("toCompetencyId");

-- CreateIndex
CREATE INDEX "lesson_competencies_competencyId_idx" ON "curriculum"."lesson_competencies"("competencyId");

-- CreateIndex
CREATE INDEX "lesson_contracts_unitId_idx" ON "curriculum"."lesson_contracts"("unitId");

-- CreateIndex
CREATE INDEX "units_stageId_idx" ON "curriculum"."units"("stageId");

-- CreateIndex
CREATE INDEX "inventory_items_itemId_idx" ON "economy"."inventory_items"("itemId");

-- CreateIndex
CREATE INDEX "consent_grants_grantedById_idx" ON "family"."consent_grants"("grantedById");

-- CreateIndex
CREATE INDEX "competency_states_competencyId_idx" ON "learning"."competency_states"("competencyId");

-- CreateIndex
CREATE INDEX "enrollments_programId_programVersionId_idx" ON "learning"."enrollments"("programId", "programVersionId");

-- CreateIndex
CREATE INDEX "enrollments_trackId_idx" ON "learning"."enrollments"("trackId");

-- CreateIndex
CREATE INDEX "evidence_learningSessionId_idx" ON "learning"."evidence"("learningSessionId");

-- CreateIndex
CREATE INDEX "evidence_competencyId_idx" ON "learning"."evidence"("competencyId");

-- CreateIndex
CREATE INDEX "evidence_activityId_idx" ON "learning"."evidence"("activityId");

-- CreateIndex
CREATE INDEX "evidence_rubricVersionId_idx" ON "learning"."evidence"("rubricVersionId");

-- CreateIndex
CREATE INDEX "learning_sessions_lessonContractId_idx" ON "learning"."learning_sessions"("lessonContractId");

-- CreateIndex
CREATE INDEX "review_items_competencyId_idx" ON "learning"."review_items"("competencyId");

-- CreateIndex
CREATE INDEX "review_items_activityId_idx" ON "learning"."review_items"("activityId");

-- CreateIndex
CREATE INDEX "safety_signals_learnerId_idx" ON "safety"."safety_signals"("learnerId");

-- Economy is backend-only. RLS without client policies is defense in depth:
-- table owners and privileged backend roles retain their normal access.
ALTER TABLE "economy"."avatar_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy"."wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy"."xp_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy"."shop_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "economy"."inventory_items" ENABLE ROW LEVEL SECURITY;

-- Local PostgreSQL does not define Supabase's API roles. Apply the lockdown
-- whenever either role exists, while keeping the migration portable locally.
DO $$
DECLARE
  api_role name;
BEGIN
  FOR api_role IN
    SELECT rolname
    FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SCHEMA "economy" FROM %I', api_role);
    EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA "economy" FROM %I', api_role);
    EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "economy" FROM %I', api_role);
    EXECUTE format('REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA "economy" FROM %I', api_role);

    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "economy" REVOKE ALL PRIVILEGES ON TABLES FROM %I', api_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "economy" REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I', api_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA "economy" REVOKE ALL PRIVILEGES ON FUNCTIONS FROM %I', api_role);
  END LOOP;
END $$;

COMMIT;
