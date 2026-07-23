import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "postgres";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX_SIGNATURE_PATTERN = /^sha256=([0-9a-f]{64})$/;
const encoder = new TextEncoder();

type OutboxEnvelope = {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  schemaVersion: number;
  occurredAt: string;
  payload: Record<string, JsonValue>;
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function text(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let offset = 0; offset < hex.length; offset += 2) {
    bytes[offset / 2] = Number.parseInt(hex.slice(offset, offset + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return mismatch === 0;
}

async function digestHex(algorithm: "SHA-256", value: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest(algorithm, encoder.encode(value)),
  );
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function verifySignature(
  secret: string,
  timestamp: string,
  eventId: string,
  body: string,
  signature: string,
): Promise<boolean> {
  const match = HEX_SIGNATURE_PATTERN.exec(signature);
  if (!match) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`${timestamp}.${eventId}.${body}`),
    ),
  );
  return timingSafeEqual(expected, hexToBytes(match[1]));
}

function parseEnvelope(value: unknown): OutboxEnvelope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const envelope = value as Record<string, unknown>;
  if (
    typeof envelope.eventId !== "string" ||
    !UUID_PATTERN.test(envelope.eventId) ||
    typeof envelope.eventType !== "string" ||
    envelope.eventType.length === 0 ||
    typeof envelope.aggregateType !== "string" ||
    envelope.aggregateType.length === 0 ||
    typeof envelope.aggregateId !== "string" ||
    envelope.aggregateId.length === 0 ||
    !Number.isInteger(envelope.schemaVersion) ||
    (envelope.schemaVersion as number) <= 0 ||
    typeof envelope.occurredAt !== "string" ||
    !Number.isFinite(Date.parse(envelope.occurredAt)) ||
    !envelope.payload ||
    typeof envelope.payload !== "object" ||
    Array.isArray(envelope.payload)
  ) {
    return null;
  }
  return envelope as OutboxEnvelope;
}

const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
const webhookSecret = Deno.env.get("OUTBOX_WEBHOOK_SECRET");
const sql = databaseUrl
  ? postgres(databaseUrl, { max: 1, prepare: false, idle_timeout: 20 })
  : null;

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return text(405, "method_not_allowed");
  if (!sql || !webhookSecret || webhookSecret.length < 32) {
    return text(503, "receiver_not_configured");
  }

  const contentLength = Number.parseInt(
    request.headers.get("content-length") ?? "0",
    10,
  );
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return text(413, "payload_too_large");
  }

  const timestamp = request.headers.get("x-outbox-timestamp") ?? "";
  const headerEventId = request.headers.get("x-outbox-event-id") ?? "";
  const signature = request.headers.get("x-outbox-signature") ?? "";
  if (!/^\d{10,12}$/.test(timestamp) || !UUID_PATTERN.test(headerEventId)) {
    return text(401, "invalid_signature");
  }

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1_000);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > MAX_TIMESTAMP_SKEW_SECONDS
  ) {
    return text(401, "expired_signature");
  }

  const body = await request.text();
  if (encoder.encode(body).byteLength > MAX_BODY_BYTES) {
    return text(413, "payload_too_large");
  }
  if (
    !(await verifySignature(
      webhookSecret,
      timestamp,
      headerEventId,
      body,
      signature,
    ))
  ) {
    return text(401, "invalid_signature");
  }

  let envelope: OutboxEnvelope | null = null;
  try {
    envelope = parseEnvelope(JSON.parse(body));
  } catch {
    return text(400, "invalid_json");
  }
  if (!envelope || envelope.eventId !== headerEventId) {
    return text(400, "invalid_envelope");
  }

  const bodyHash = await digestHex("SHA-256", body);
  try {
    const receipts = await sql`
      INSERT INTO "audit"."outbox_webhook_receipts" (
        "eventId",
        "bodyHash",
        "eventType",
        "aggregateType",
        "aggregateId",
        "schemaVersion",
        "occurredAt",
        "payload"
      )
      VALUES (
        ${envelope.eventId}::uuid,
        ${bodyHash},
        ${envelope.eventType},
        ${envelope.aggregateType},
        ${envelope.aggregateId},
        ${envelope.schemaVersion},
        ${envelope.occurredAt}::timestamptz,
        ${sql.json(envelope.payload)}
      )
      ON CONFLICT ("eventId") DO UPDATE
      SET
        "deliveryCount" = "audit"."outbox_webhook_receipts"."deliveryCount" + 1,
        "lastReceivedAt" = clock_timestamp()
      WHERE "audit"."outbox_webhook_receipts"."bodyHash" = EXCLUDED."bodyHash"
      RETURNING "eventId"
    `;
    if (receipts.length === 0) return text(409, "event_id_conflict");
    return new Response(null, {
      status: 204,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return text(500, "storage_unavailable");
  }
});
