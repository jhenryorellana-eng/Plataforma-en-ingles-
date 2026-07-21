BEGIN;

-- A credential validation performed outside PostgreSQL may race a password
-- reset. This monotonic version lets session creation use a transactional CAS;
-- reset advances it on both sides of the provider network call.
ALTER TABLE "identity"."users"
  ADD COLUMN "credentialVersion" INTEGER NOT NULL DEFAULT 0;

-- Fail closed rather than silently treating an unclassified learner as an
-- adult. Operators must repair any legacy row before this migration proceeds.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "identity"."users"
    WHERE "role" = 'learner' AND "ageBand" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot enforce learner age band: identity.users contains learner rows with null ageBand';
  END IF;
END $$;

ALTER TABLE "identity"."users"
  ADD CONSTRAINT "users_learner_age_band_required"
  CHECK ("role" <> 'learner' OR "ageBand" IS NOT NULL);

-- Invitation secrets are one-time values. Existing plaintext invitations are
-- deliberately invalidated; only HMAC digests are stored for newly issued codes.
ALTER TABLE "family"."guardian_invitations"
  ADD COLUMN "codeHash" TEXT,
  ADD COLUMN "expiresAt" TIMESTAMPTZ(6) DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours');

UPDATE "family"."guardian_invitations"
SET "status" = 'expired'
WHERE "status" = 'pending';

UPDATE "family"."guardian_invitations"
SET "expiresAt" = "createdAt" + INTERVAL '24 hours';

ALTER TABLE "family"."guardian_invitations"
  ALTER COLUMN "expiresAt" SET NOT NULL,
  ALTER COLUMN "code" DROP NOT NULL;

CREATE UNIQUE INDEX "guardian_invitations_codeHash_key"
  ON "family"."guardian_invitations"("codeHash");

-- Preserve history but make revocation explicit for youth assent.
ALTER TABLE "family"."youth_assents"
  ADD COLUMN "revokedAt" TIMESTAMPTZ(6);

LOCK TABLE "family"."youth_assents" IN SHARE ROW EXCLUSIVE MODE;

UPDATE "family"."youth_assents"
SET "revokedAt" = CURRENT_TIMESTAMP
WHERE "revokedAt" IS NULL AND "noticeVersion" <> '2026-07';

WITH ranked_assents AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "learnerId"
    ORDER BY "recordedAt" DESC, "id" DESC
  ) AS rn
  FROM "family"."youth_assents"
  WHERE "revokedAt" IS NULL
)
UPDATE "family"."youth_assents" AS assent_row
SET "revokedAt" = CURRENT_TIMESTAMP
FROM ranked_assents
WHERE assent_row."id" = ranked_assents."id" AND ranked_assents.rn > 1;

CREATE UNIQUE INDEX "youth_assents_active_learner_key"
  ON "family"."youth_assents"("learnerId")
  WHERE "revokedAt" IS NULL;

ALTER TABLE "family"."youth_assents"
  ADD CONSTRAINT "youth_assents_active_notice_version_check"
  CHECK ("revokedAt" IS NOT NULL OR "noticeVersion" = '2026-07');

-- Collapse any pre-existing duplicate active grants before enforcing the
-- invariant at the database boundary.
-- This lock closes the old-writer window: all existing writers finish first,
-- then cleanup + unique-index creation complete before writes resume.
LOCK TABLE "family"."consent_grants" IN SHARE ROW EXCLUSIVE MODE;

UPDATE "family"."consent_grants"
SET "status" = 'expired', "revokedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'granted' AND "noticeVersion" <> '2026-07';

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "learnerId", "purpose"
    ORDER BY "grantedAt" DESC, "id" DESC
  ) AS rn
  FROM "family"."consent_grants"
  WHERE "status" = 'granted'
)
UPDATE "family"."consent_grants" AS grant_row
SET "status" = 'expired', "revokedAt" = CURRENT_TIMESTAMP
FROM ranked
WHERE grant_row."id" = ranked."id" AND ranked.rn > 1;

CREATE UNIQUE INDEX "consent_grants_active_learner_purpose_key"
  ON "family"."consent_grants"("learnerId", "purpose")
  WHERE "status" = 'granted';

COMMIT;
