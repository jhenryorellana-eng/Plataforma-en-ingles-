import { createHmac } from 'node:crypto';
import type { OutboxEvent } from '@prisma/client';

type WebhookEvent = Pick<
  OutboxEvent,
  'eventId' | 'eventType' | 'aggregateType' | 'aggregateId' | 'schemaVersion' | 'occurredAt' | 'payload'
>;

export interface SignedOutboxWebhook {
  body: string;
  headers: Record<string, string>;
}

/** Produce el cuerpo y los encabezados que el receptor debe verificar antes de procesar. */
export function signOutboxWebhook(
  event: WebhookEvent,
  secret: string,
  timestamp = Math.floor(Date.now() / 1_000).toString(),
): SignedOutboxWebhook {
  const body = JSON.stringify({
    eventId: event.eventId,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    schemaVersion: event.schemaVersion,
    occurredAt: event.occurredAt.toISOString(),
    payload: event.payload,
  });
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${event.eventId}.${body}`)
    .digest('hex');
  return {
    body,
    headers: {
      'content-type': 'application/json',
      'x-outbox-event-id': event.eventId,
      'x-outbox-timestamp': timestamp,
      'x-outbox-signature': `sha256=${signature}`,
    },
  };
}
