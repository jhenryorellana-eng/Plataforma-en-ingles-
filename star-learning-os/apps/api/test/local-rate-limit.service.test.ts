import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalRateLimitService, type LocalRateLimitPolicy } from '../src/common/local-rate-limit.service';

const policy: LocalRateLimitPolicy = {
  windowMs: 1_000,
  maxPerIp: 3,
  maxPerIdentifier: 1,
};

test('limita por identificador normalizado y expone un retry estable', () => {
  const limiter = new LocalRateLimitService();
  limiter.assertAllowed('auth.login', '203.0.113.10', ' User@Example.com ', policy, 1_000);

  assert.throws(
    () => limiter.assertAllowed('auth.login', '203.0.113.11', 'user@example.com', policy, 1_100),
    (error: unknown) =>
      error instanceof Error &&
      'code' in error &&
      error.code === 'RATE_LIMITED' &&
      'status' in error &&
      error.status === 429 &&
      'details' in error &&
      (error.details as { retryAfterSeconds?: number }).retryAfterSeconds === 1,
  );
});

test('no conserva IP ni identificador en claro y libera la ventana vencida', () => {
  const limiter = new LocalRateLimitService();
  limiter.assertAllowed('auth.recovery', '198.51.100.4', 'secret@example.com', policy, 5_000);

  const buckets = (limiter as unknown as { buckets: Map<string, unknown> }).buckets;
  const serializedKeys = [...buckets.keys()].join(' ');
  assert.equal(serializedKeys.includes('198.51.100.4'), false);
  assert.equal(serializedKeys.includes('secret@example.com'), false);

  assert.doesNotThrow(() =>
    limiter.assertAllowed('auth.recovery', '198.51.100.4', 'secret@example.com', policy, 6_001),
  );
});
