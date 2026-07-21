import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Prisma, type OutboxEvent } from '@prisma/client';
import { loadConfig } from '../../config/config';
import { PrismaService } from '../../prisma/prisma.service';
import { signOutboxWebhook } from './outbox.webhook';

const POLL_INTERVAL_MS = 2_000;
const BATCH_SIZE = 20;
const DISPATCH_CONCURRENCY = 5;
const WEBHOOK_TIMEOUT_MS = 10_000;
const LEASE_DURATION_MS = 90_000;
const BASE_RETRY_DELAY_MS = 4_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;

export const OUTBOX_MAX_DELIVERY_ATTEMPTS = 8;

export type OutboxReadiness =
  | 'local-log'
  | 'pending-preserved'
  | 'webhook-ready'
  | 'webhook-retrying'
  | 'webhook-dead-letter';

interface WebhookFailure {
  code: string;
  retryable: boolean;
}

export class WebhookHttpError extends Error {
  constructor(readonly status: number) {
    super(`webhook HTTP ${status}`);
    this.name = 'WebhookHttpError';
  }
}

export function classifyWebhookFailure(error: unknown): WebhookFailure {
  if (error instanceof WebhookHttpError) {
    const retryable = error.status === 408 || error.status === 429 || error.status >= 500;
    return { code: `http_${error.status}`, retryable };
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return { code: 'timeout', retryable: true };
  }
  return { code: 'network_error', retryable: true };
}

export function outboxRetryDelayMs(attempt: number): number {
  const exponent = Math.max(0, Math.min(attempt - 1, 10));
  return Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** exponent);
}

/**
 * Entrega el outbox con semántica al-menos-una-vez. Cada lote se reclama con
 * SKIP LOCKED y un lease; el receptor todavía debe deduplicar por `eventId`
 * porque un proceso puede caer después del 2xx y antes de confirmar la fila.
 */
@Injectable()
export class OutboxDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('Outbox');
  private readonly config = loadConfig();
  private readonly workerId = `${hostname()}:${process.pid}:${randomUUID()}`;
  private timer: NodeJS.Timeout | null = null;
  private draining = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    if (this.config.outboxDispatchMode === 'preserve') {
      this.logger.warn('outbox en modo preserve: los eventos pendientes no se marcaran como publicados');
      return;
    }
    this.timer = setInterval(() => void this.drain(), POLL_INTERVAL_MS);
    void this.drain();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async getReadiness(): Promise<OutboxReadiness> {
    if (this.config.outboxDispatchMode === 'preserve') return 'pending-preserved';
    if (this.config.outboxDispatchMode === 'local-log') return 'local-log';

    const [state] = await this.prisma.$queryRaw<
      Array<{ hasDeadLetters: boolean; hasRetrying: boolean }>
    >(Prisma.sql`
      SELECT
        EXISTS (
          SELECT 1
          FROM "audit"."outbox_events"
          WHERE "deadLetteredAt" IS NOT NULL
        ) AS "hasDeadLetters",
        EXISTS (
          SELECT 1
          FROM "audit"."outbox_events"
          WHERE "publishedAt" IS NULL
            AND "deadLetteredAt" IS NULL
            AND "attempts" > 0
        ) AS "hasRetrying"
    `);
    if (!state) throw new Error('outbox readiness query returned no rows');
    if (state.hasDeadLetters) return 'webhook-dead-letter';
    return state.hasRetrying ? 'webhook-retrying' : 'webhook-ready';
  }

  isReady(readiness: OutboxReadiness): boolean {
    return readiness !== 'pending-preserved' && readiness !== 'webhook-dead-letter';
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      const claimed = await this.claimBatch();
      for (let offset = 0; offset < claimed.length; offset += DISPATCH_CONCURRENCY) {
        const slice = claimed.slice(offset, offset + DISPATCH_CONCURRENCY);
        const settled = await Promise.allSettled(slice.map((event) => this.dispatch(event)));
        for (const result of settled) {
          if (result.status === 'rejected') {
            this.logger.error(`outbox no pudo persistir el resultado (${this.operationalErrorCode(result.reason)})`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`outbox claim falló (${this.operationalErrorCode(error)})`);
    } finally {
      this.draining = false;
    }
  }

  private async claimBatch(): Promise<OutboxEvent[]> {
    return this.prisma.$queryRaw<OutboxEvent[]>(Prisma.sql`
      WITH candidates AS (
        SELECT event."sequenceId"
        FROM "audit"."outbox_events" AS event
        WHERE event."publishedAt" IS NULL
          AND event."deadLetteredAt" IS NULL
          AND event."nextAttemptAt" <= clock_timestamp()
          AND (event."leaseUntil" IS NULL OR event."leaseUntil" <= clock_timestamp())
        ORDER BY event."nextAttemptAt" ASC, event."sequenceId" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${BATCH_SIZE}
      )
      UPDATE "audit"."outbox_events" AS event
      SET
        "leaseOwner" = ${this.workerId},
        "leaseUntil" = clock_timestamp() + (${LEASE_DURATION_MS} * interval '1 millisecond')
      FROM candidates
      WHERE event."sequenceId" = candidates."sequenceId"
      RETURNING event.*
    `);
  }

  private async dispatch(event: OutboxEvent): Promise<void> {
    if (this.config.outboxDispatchMode === 'local-log') {
      const updated = await this.markPublished(event);
      if (updated > 0) {
        this.logger.log(`evento publicado localmente: ${event.eventType} (${event.aggregateType})`);
      }
      return;
    }

    try {
      await this.publishToWebhook(event);
      const updated = await this.markPublished(event);
      if (updated > 0) {
        this.logger.log(`evento publicado por webhook: ${event.eventType} (${event.aggregateType})`);
      } else {
        this.logger.warn(`2xx recibido, pero el lease ya no pertenece a este worker (${event.eventType})`);
      }
    } catch (error) {
      const failure = classifyWebhookFailure(error);
      const nextAttempt = event.attempts + 1;
      const deadLetter = !failure.retryable || nextAttempt >= OUTBOX_MAX_DELIVERY_ATTEMPTS;
      const updated = deadLetter
        ? await this.markDeadLetter(event, failure.code)
        : await this.scheduleRetry(event, failure.code, outboxRetryDelayMs(nextAttempt));

      if (updated === 0) {
        this.logger.warn(`fallo ignorado porque el lease ya no pertenece a este worker (${event.eventType})`);
      } else if (deadLetter) {
        this.logger.error(
          `evento enviado a dead-letter: ${event.eventType} (${failure.code}, intento ${nextAttempt})`,
        );
      } else {
        this.logger.warn(
          `entrega reprogramada: ${event.eventType} (${failure.code}, intento ${nextAttempt})`,
        );
      }
    }
  }

  private async markPublished(event: OutboxEvent): Promise<number> {
    return this.prisma.$executeRaw(Prisma.sql`
      UPDATE "audit"."outbox_events"
      SET
        "publishedAt" = clock_timestamp(),
        "attempts" = "attempts" + 1,
        "leaseOwner" = NULL,
        "leaseUntil" = NULL,
        "lastErrorCode" = NULL
      WHERE "sequenceId" = ${event.sequenceId}
        AND "leaseOwner" = ${this.workerId}
        AND "publishedAt" IS NULL
        AND "deadLetteredAt" IS NULL
    `);
  }

  private async scheduleRetry(event: OutboxEvent, errorCode: string, delayMs: number): Promise<number> {
    return this.prisma.$executeRaw(Prisma.sql`
      UPDATE "audit"."outbox_events"
      SET
        "attempts" = "attempts" + 1,
        "nextAttemptAt" = clock_timestamp() + (${delayMs} * interval '1 millisecond'),
        "leaseOwner" = NULL,
        "leaseUntil" = NULL,
        "lastErrorCode" = ${errorCode}
      WHERE "sequenceId" = ${event.sequenceId}
        AND "leaseOwner" = ${this.workerId}
        AND "publishedAt" IS NULL
        AND "deadLetteredAt" IS NULL
    `);
  }

  private async markDeadLetter(event: OutboxEvent, errorCode: string): Promise<number> {
    return this.prisma.$executeRaw(Prisma.sql`
      UPDATE "audit"."outbox_events"
      SET
        "attempts" = "attempts" + 1,
        "deadLetteredAt" = clock_timestamp(),
        "leaseOwner" = NULL,
        "leaseUntil" = NULL,
        "lastErrorCode" = ${errorCode}
      WHERE "sequenceId" = ${event.sequenceId}
        AND "leaseOwner" = ${this.workerId}
        AND "publishedAt" IS NULL
        AND "deadLetteredAt" IS NULL
    `);
  }

  private async publishToWebhook(event: OutboxEvent): Promise<void> {
    const request = signOutboxWebhook(event, this.config.outboxWebhookSecret);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    try {
      const response = await fetch(this.config.outboxWebhookUrl, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
        redirect: 'error',
      });
      if (!response.ok) throw new WebhookHttpError(response.status);
      await response.body?.cancel();
    } finally {
      clearTimeout(timeout);
    }
  }

  private operationalErrorCode(error: unknown): string {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
    if (error instanceof Error) return error.name || 'Error';
    return 'UnknownError';
  }
}
