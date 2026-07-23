BEGIN;

-- The external outbox receiver persists one durable receipt per event. A
-- repeated delivery with the same body is counted, while a reused eventId with
-- different contents is rejected by the Edge Function.
CREATE TABLE "audit"."outbox_webhook_receipts" (
  "eventId" UUID NOT NULL,
  "bodyHash" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "schemaVersion" INTEGER NOT NULL,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReceivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveryCount" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "outbox_webhook_receipts_pkey" PRIMARY KEY ("eventId"),
  CONSTRAINT "outbox_webhook_receipts_body_hash_check"
    CHECK ("bodyHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "outbox_webhook_receipts_schema_version_check"
    CHECK ("schemaVersion" > 0),
  CONSTRAINT "outbox_webhook_receipts_delivery_count_check"
    CHECK ("deliveryCount" > 0)
);

CREATE INDEX "outbox_webhook_receipts_received_at_idx"
  ON "audit"."outbox_webhook_receipts"("receivedAt");

REVOKE ALL PRIVILEGES ON "audit"."outbox_webhook_receipts" FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL PRIVILEGES ON "audit"."outbox_webhook_receipts" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL PRIVILEGES ON "audit"."outbox_webhook_receipts" FROM authenticated;
  END IF;
END
$$;

COMMIT;
