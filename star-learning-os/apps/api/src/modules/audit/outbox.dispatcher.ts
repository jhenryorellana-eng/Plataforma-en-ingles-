import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const POLL_INTERVAL_MS = 2000;
const BATCH_SIZE = 50;

/**
 * Despachador local del outbox. En producción este rol lo cumple Cloud Tasks
 * (Stack §4.3); localmente publica marcando el evento y registrándolo en el
 * logger central sin contenido sensible.
 */
@Injectable()
export class OutboxDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Outbox');
  private timer: NodeJS.Timeout | null = null;
  private draining = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.drain(), POLL_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      const pending = await this.prisma.outboxEvent.findMany({
        where: { publishedAt: null },
        orderBy: { sequenceId: 'asc' },
        take: BATCH_SIZE,
      });
      for (const event of pending) {
        await this.prisma.outboxEvent.update({
          where: { sequenceId: event.sequenceId },
          data: { publishedAt: new Date(), attempts: { increment: 1 } },
        });
        this.logger.log(`evento publicado: ${event.eventType} (${event.aggregateType})`);
      }
    } catch (error) {
      this.logger.warn(`outbox drain falló: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.draining = false;
    }
  }
}
