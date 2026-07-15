import { Body, Controller, Get, Post } from '@nestjs/common';
import type { SafetySeverity } from '@prisma/client';
import { zSafetyReportRequest } from '@star/contracts';
import { CurrentUser, Roles } from '../../common/decorators';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';
import { PrismaService } from '../../prisma/prisma.service';

/** Triage P0–P3 (Stack §9.3): la severidad determina la atención humana. */
const SEVERITY_BY_CATEGORY: Record<string, SafetySeverity> = {
  self_harm: 'p1',
  abuse: 'p1',
  bullying: 'p2',
  pii_request: 'p2',
  inappropriate_content: 'p2',
  technical: 'p3',
  other: 'p3',
};

const EXCERPT_MAX_LENGTH = 300;

@Controller()
export class SafetyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
  ) {}

  /** SAF-01: el reporte juvenil siempre está disponible y devuelve número de caso. */
  @Post('safety/report')
  async report(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<unknown> {
    const request = parse(zSafetyReportRequest, body);
    const severity = SEVERITY_BY_CATEGORY[request.category] ?? 'p3';

    const result = await this.prisma.$transaction(async (tx) => {
      const signal = await tx.safetySignal.create({
        data: {
          learnerId: user.id,
          voiceSessionId: request.voiceSessionId,
          source: 'student_report',
          category: request.category,
          severity,
          excerptRedacted: request.comment?.slice(0, EXCERPT_MAX_LENGTH),
        },
      });
      const safetyCase = await tx.safetyCase.create({ data: { signalId: signal.id } });
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'safety_case',
        aggregateId: safetyCase.id,
        eventType: 'safety.alerted',
        payload: { severity, category: request.category },
      });
      await this.auditService.recordInTx(tx, {
        actorId: user.id,
        action: 'safety.reported',
        objectType: 'safety_case',
        objectId: safetyCase.id,
        metadata: { severity },
      });
      return safetyCase;
    });

    return {
      caseId: result.id,
      severity,
      message: 'Gracias por avisarnos. Una persona del equipo revisará tu reporte.',
    };
  }

  @Roles('staff')
  @Get('admin/safety/cases')
  async cases(): Promise<unknown> {
    const signals = await this.prisma.safetySignal.findMany({
      where: { status: { not: 'resolved' } },
      orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
      take: 50,
      include: { case: true, learner: { select: { displayName: true, ageBand: true } } },
    });
    return signals.map((signal) => ({
      caseId: signal.case?.id ?? null,
      severity: signal.severity,
      category: signal.category,
      status: signal.status,
      learner: signal.learner.displayName,
      ageBand: signal.learner.ageBand,
      excerpt: signal.excerptRedacted,
      createdAt: signal.createdAt.toISOString(),
    }));
  }
}
