import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  objectType: string;
  objectId: string;
  purpose?: string;
  metadata?: Record<string, unknown>;
}

/** Registro de acciones críticas (Stack §12.2). Sin PII más allá de IDs. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.prisma.auditEvent.create({ data: this.toData(entry) });
  }

  async recordInTx(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    await tx.auditEvent.create({ data: this.toData(entry) });
  }

  private toData(entry: AuditEntry): Prisma.AuditEventCreateInput {
    return {
      actorId: entry.actorId,
      action: entry.action,
      objectType: entry.objectType,
      objectId: entry.objectId,
      purpose: entry.purpose,
      metadata: (entry.metadata ?? undefined) as Prisma.InputJsonObject | undefined,
    };
  }
}
