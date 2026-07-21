import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { signOutboxWebhook } from '../src/modules/audit/outbox.webhook';

test('firma un sobre mínimo de outbox con timestamp y eventId', () => {
  const event = {
    eventId: '018f81da-2ad6-7f61-96a4-b555fe547840',
    eventType: 'learning.session.completed',
    aggregateType: 'learningSession',
    aggregateId: 'session-123',
    schemaVersion: 1,
    occurredAt: new Date('2026-07-20T20:00:00.000Z'),
    payload: { lessonCode: 'S1-L2', result: 'completed' },
  };
  const secret = 'test-only-webhook-secret-with-32-characters';
  const request = signOutboxWebhook(event, secret, '1784577600');

  assert.deepEqual(JSON.parse(request.body), {
    eventId: event.eventId,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    schemaVersion: 1,
    occurredAt: '2026-07-20T20:00:00.000Z',
    payload: event.payload,
  });
  assert.deepEqual(Object.keys(JSON.parse(request.body)).sort(), [
    'aggregateId',
    'aggregateType',
    'eventId',
    'eventType',
    'occurredAt',
    'payload',
    'schemaVersion',
  ]);
  assert.equal(request.headers['x-outbox-event-id'], event.eventId);
  assert.equal(request.headers['x-outbox-timestamp'], '1784577600');
  assert.equal(
    request.headers['x-outbox-signature'],
    `sha256=${createHmac('sha256', secret)
      .update(`1784577600.${event.eventId}.${request.body}`)
      .digest('hex')}`,
  );
});
