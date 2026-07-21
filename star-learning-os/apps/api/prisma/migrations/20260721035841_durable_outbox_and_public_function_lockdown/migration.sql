-- Keep the outbox schema transition atomic. The tables are currently small,
-- so the brief locks are preferable to a partially upgraded dispatcher state.
BEGIN;

-- Durable, multi-worker outbox delivery state.
ALTER TABLE "audit"."outbox_events"
  ADD COLUMN "nextAttemptAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseUntil" TIMESTAMPTZ(6),
  ADD COLUMN "deadLetteredAt" TIMESTAMPTZ(6),
  ADD COLUMN "lastErrorCode" TEXT;

-- Claim only due, unpublished events. Keeping this partial avoids indexing the
-- immutable history after an event is published or moved to dead-letter.
CREATE INDEX "outbox_dispatch_ready_idx"
  ON "audit"."outbox_events"("nextAttemptAt", "sequenceId")
  WHERE "publishedAt" IS NULL AND "deadLetteredAt" IS NULL;

-- Readiness checks use these small partial indexes instead of scanning history.
CREATE INDEX "outbox_dead_letter_idx"
  ON "audit"."outbox_events"("sequenceId")
  WHERE "deadLetteredAt" IS NOT NULL;

CREATE INDEX "outbox_retrying_idx"
  ON "audit"."outbox_events"("sequenceId")
  WHERE "publishedAt" IS NULL AND "deadLetteredAt" IS NULL AND "attempts" > 0;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Economy is
-- backend-only, so remove both current and future inherited function access.
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA "economy" FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA "economy"
  REVOKE ALL PRIVILEGES ON FUNCTIONS FROM PUBLIC;

COMMIT;
