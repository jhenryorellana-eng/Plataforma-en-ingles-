import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { uuidv7 } from '@star/contracts';

export interface OutboxEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * Transactional outbox (Arquitectura §12.1): el evento se escribe en la MISMA
 * transacción que el estado. Los eventos no contienen PII ni texto libre.
 */
@Injectable()
export class OutboxService {
  async emitInTx(tx: Prisma.TransactionClient, event: OutboxEventInput): Promise<void> {
    await tx.outboxEvent.create({
      data: {
        eventId: uuidv7(),
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload as Prisma.InputJsonObject,
        occurredAt: new Date(),
      },
    });
  }
}
