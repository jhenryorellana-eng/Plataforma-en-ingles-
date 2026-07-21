import assert from 'node:assert/strict';
import test from 'node:test';
import type { OutboxEvent } from '@prisma/client';
import {
  classifyWebhookFailure,
  OUTBOX_MAX_DELIVERY_ATTEMPTS,
  OutboxDispatcher,
  outboxRetryDelayMs,
  WebhookHttpError,
  type OutboxReadiness,
} from '../src/modules/audit/outbox.dispatcher';

interface SqlLike {
  strings?: readonly string[];
  values?: unknown[];
}

interface DispatcherHarness {
  config: {
    outboxDispatchMode: 'local-log' | 'preserve' | 'webhook';
    outboxWebhookUrl: string;
    outboxWebhookSecret: string;
  };
  workerId: string;
  logger: { log(): void; warn(): void; error(): void };
  drain(): Promise<void>;
  publishToWebhook(event: OutboxEvent): Promise<void>;
  getReadiness(): Promise<OutboxReadiness>;
  isReady(readiness: OutboxReadiness): boolean;
}

const WEBHOOK_SECRET = 'test-only-webhook-secret-with-32-characters';

function sqlText(query: SqlLike): string {
  return query.strings?.join('?') ?? '';
}

function event(sequenceId: number, attempts = 0): OutboxEvent {
  return {
    sequenceId: BigInt(sequenceId),
    eventId: `00000000-0000-7000-8000-${sequenceId.toString().padStart(12, '0')}`,
    aggregateType: 'test',
    aggregateId: `aggregate-${sequenceId}`,
    eventType: `test.event_${sequenceId}`,
    schemaVersion: 1,
    payload: {},
    occurredAt: new Date('2026-07-20T20:00:00.000Z'),
    publishedAt: null,
    attempts,
    nextAttemptAt: new Date('2026-07-20T20:00:00.000Z'),
    leaseOwner: 'worker-test',
    leaseUntil: new Date('2026-07-20T20:01:30.000Z'),
    deadLetteredAt: null,
    lastErrorCode: null,
  };
}

function dispatcher(prisma: object): DispatcherHarness {
  const instance = new OutboxDispatcher(prisma as never) as unknown as DispatcherHarness;
  instance.config = {
    outboxDispatchMode: 'webhook',
    outboxWebhookUrl: 'https://receiver.example.test/outbox',
    outboxWebhookSecret: WEBHOOK_SECRET,
  };
  instance.workerId = 'worker-test';
  instance.logger = { log() {}, warn() {}, error() {} };
  return instance;
}

test('clasifica 408, 429, 5xx y red como reintentables; otros 4xx son permanentes', () => {
  assert.deepEqual(classifyWebhookFailure(new WebhookHttpError(408)), {
    code: 'http_408',
    retryable: true,
  });
  assert.deepEqual(classifyWebhookFailure(new WebhookHttpError(429)), {
    code: 'http_429',
    retryable: true,
  });
  assert.deepEqual(classifyWebhookFailure(new WebhookHttpError(503)), {
    code: 'http_503',
    retryable: true,
  });
  assert.deepEqual(classifyWebhookFailure(new WebhookHttpError(422)), {
    code: 'http_422',
    retryable: false,
  });
  assert.deepEqual(classifyWebhookFailure(new TypeError('fetch failed')), {
    code: 'network_error',
    retryable: true,
  });
  const aborted = new Error('aborted');
  aborted.name = 'AbortError';
  assert.deepEqual(classifyWebhookFailure(aborted), { code: 'timeout', retryable: true });
  assert.equal(outboxRetryDelayMs(1), 4_000);
  assert.equal(outboxRetryDelayMs(2), 8_000);
  assert.ok(outboxRetryDelayMs(OUTBOX_MAX_DELIVERY_ATTEMPTS) <= 5 * 60_000);
});

test('reclama con SKIP LOCKED y un 4xx venenoso no impide publicar el siguiente evento', async () => {
  const queries: SqlLike[] = [];
  const updates: SqlLike[] = [];
  const prisma = {
    $queryRaw: async (query: SqlLike) => {
      queries.push(query);
      return [event(1), event(2)];
    },
    $executeRaw: async (query: SqlLike) => {
      updates.push(query);
      return 1;
    },
  };
  const instance = dispatcher(prisma);
  const originalFetch = globalThis.fetch;
  const redirects: RequestRedirect[] = [];
  globalThis.fetch = async (_input, init) => {
    redirects.push(init?.redirect ?? 'follow');
    const body = JSON.parse(String(init?.body)) as { eventId: string };
    return body.eventId.endsWith('000001')
      ? new Response(null, { status: 422 })
      : new Response(null, { status: 204 });
  };

  try {
    await instance.drain();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(queries.length, 1);
  assert.match(sqlText(queries[0]!), /FOR UPDATE SKIP LOCKED/);
  assert.match(sqlText(queries[0]!), /"leaseOwner" =/);
  assert.deepEqual(redirects, ['error', 'error']);
  assert.equal(updates.length, 2);
  assert.ok(updates.some((query) => sqlText(query).includes('"deadLetteredAt" = clock_timestamp()')));
  assert.ok(updates.some((query) => sqlText(query).includes('"publishedAt" = clock_timestamp()')));
  for (const query of updates) {
    assert.match(sqlText(query), /AND "leaseOwner" =/);
    assert.ok(query.values?.includes('worker-test'));
  }
});

test('persiste el backoff y manda a dead-letter al alcanzar el máximo', async () => {
  const updates: SqlLike[] = [];
  const claimed = [event(1), event(2, OUTBOX_MAX_DELIVERY_ATTEMPTS - 1)];
  const prisma = {
    $queryRaw: async () => claimed,
    $executeRaw: async (query: SqlLike) => {
      updates.push(query);
      return 1;
    },
  };
  const instance = dispatcher(prisma);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503 });

  try {
    await instance.drain();
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(updates.length, 2);
  const retry = updates.find((query) => sqlText(query).includes('"nextAttemptAt" ='));
  const deadLetter = updates.find((query) => sqlText(query).includes('"deadLetteredAt" ='));
  assert.ok(retry);
  assert.ok(retry.values?.includes('http_503'));
  assert.ok(deadLetter);
  assert.ok(deadLetter.values?.includes('http_503'));
});

test('readiness consulta estado durable; retrying sirve tráfico y dead-letter no', async () => {
  const states = [
    [{ hasDeadLetters: false, hasRetrying: true }],
    [{ hasDeadLetters: true, hasRetrying: false }],
    [{ hasDeadLetters: false, hasRetrying: false }],
  ];
  const prisma = {
    $queryRaw: async () => states.shift(),
  };
  const instance = dispatcher(prisma);

  const retrying = await instance.getReadiness();
  assert.equal(retrying, 'webhook-retrying');
  assert.equal(instance.isReady(retrying), true);

  const deadLetter = await instance.getReadiness();
  assert.equal(deadLetter, 'webhook-dead-letter');
  assert.equal(instance.isReady(deadLetter), false);

  const recovered = await instance.getReadiness();
  assert.equal(recovered, 'webhook-ready');
  assert.equal(instance.isReady(recovered), true);
});

test('redirect:error evita reenviar cuerpo y firmas a la ubicación indicada', async () => {
  const prisma = { $queryRaw: async () => [], $executeRaw: async () => 1 };
  const instance = dispatcher(prisma);
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let leakedToRedirect = false;
  globalThis.fetch = async (_input, init) => {
    calls += 1;
    assert.equal(init?.redirect, 'error');
    if (init?.redirect !== 'error') leakedToRedirect = true;
    throw new TypeError('fetch failed', { cause: new Error('unexpected redirect') });
  };

  try {
    await assert.rejects(instance.publishToWebhook(event(1)), TypeError);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls, 1);
  assert.equal(leakedToRedirect, false);
});
