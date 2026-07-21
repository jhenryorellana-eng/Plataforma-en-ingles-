import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import type { SafetySeverity } from '@prisma/client';
import { zSafetyCaseUpdateRequest, zSafetyReportRequest } from '@star/contracts';
import { Capabilities, CurrentUser, Roles } from '../../common/decorators';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { AppError, forbidden, notFound } from '../../common/errors';
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
  @Roles('learner')
  @Post('safety/report')
  async report(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<unknown> {
    const request = parse(zSafetyReportRequest, body);
    const severity = SEVERITY_BY_CATEGORY[request.category] ?? 'p3';
    const voiceSession = request.voiceSessionId
      ? await this.prisma.voiceSession.findUnique({
          where: { id: request.voiceSessionId },
          include: { enrollment: { select: { id: true, learnerId: true } } },
        })
      : null;
    if (request.voiceSessionId && !voiceSession) throw notFound('Sesión de voz no encontrada');
    if (voiceSession && voiceSession.enrollment.learnerId !== user.id) {
      throw forbidden('La sesión reportada no pertenece al alumno');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const signal = await tx.safetySignal.create({
        data: {
          learnerId: user.id,
          enrollmentId: voiceSession?.enrollment.id,
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
  @Capabilities('safeguarding')
  @Get('admin/safety/cases')
  async cases(): Promise<unknown> {
    const signals = await this.prisma.safetySignal.findMany({
      where: { status: { not: 'resolved' } },
      orderBy: [{ severity: 'asc' }, { createdAt: 'asc' }],
      take: 50,
      include: {
        case: { include: { assignee: { select: { displayName: true } } } },
        learner: { select: { displayName: true, ageBand: true } },
      },
    });
    return signals.map((signal) => ({
      caseId: signal.case?.id ?? null,
      severity: signal.severity,
      category: signal.category,
      status: signal.status,
      assignee: signal.case?.assignee?.displayName ?? null,
      learner: signal.learner.displayName,
      ageBand: signal.learner.ageBand,
      excerpt: signal.excerptRedacted,
      createdAt: signal.createdAt.toISOString(),
    }));
  }

  @Roles('staff')
  @Capabilities('safeguarding')
  @Patch('admin/safety/cases/:id')
  async updateCase(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ ok: true; status: 'triaged' | 'resolved' }> {
    const request = parse(zSafetyCaseUpdateRequest, body);
    const safetyCase = await this.prisma.safetyCase.findUnique({ where: { id } });
    if (!safetyCase) throw notFound('Caso de seguridad no encontrado');
    if (safetyCase.status === 'resolved') {
      throw new AppError('VALIDATION_FAILED', 409, 'El caso ya fue resuelto');
    }
    const resolvedAt = request.status === 'resolved' ? new Date() : null;
    await this.prisma.$transaction(async (tx) => {
      await tx.safetyCase.update({
        where: { id },
        data: {
          status: request.status,
          assigneeId: user.id,
          resolution: request.resolution,
          resolvedAt,
        },
      });
      await tx.safetySignal.update({
        where: { id: safetyCase.signalId },
        data: { status: request.status },
      });
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'safety_case',
        aggregateId: id,
        eventType: `safety.${request.status}`,
        payload: {},
      });
      await this.auditService.recordInTx(tx, {
        actorId: user.id,
        action: `safety.${request.status}`,
        objectType: 'safety_case',
        objectId: id,
        purpose: request.resolution,
      });
    });
    return { ok: true, status: request.status };
  }
}
