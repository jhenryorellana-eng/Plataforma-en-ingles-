import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ReviewStatus } from '@prisma/client';
import { zHumanReviewDecisionRequest } from '@star/contracts';
import { CurrentUser, Roles } from '../../common/decorators';
import { AppError, notFound } from '../../common/errors';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Cola de revisión humana (Stack §10): las decisiones significativas de menores
 * permanecen provisionales hasta que una persona confirme, corrija o invalide.
 */
@Roles('staff')
@Controller('human-reviews')
export class ReviewController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async list(@Query('status') status?: string): Promise<unknown> {
    const filter: ReviewStatus = (['pending', 'confirmed', 'corrected', 'invalidated'] as const).includes(
      status as ReviewStatus,
    )
      ? (status as ReviewStatus)
      : 'pending';
    const reviews = await this.prisma.humanReview.findMany({
      where: { status: filter },
      orderBy: { createdAt: 'asc' },
      take: 50,
      include: {
        learner: { select: { displayName: true, ageBand: true } },
        enrollment: { include: { program: true } },
      },
    });
    return reviews.map((review) => ({
      id: review.id,
      caseType: review.caseType,
      status: review.status,
      learner: review.learner.displayName,
      ageBand: review.learner.ageBand,
      program: review.enrollment?.program.name ?? null,
      payload: review.payload,
      createdAt: review.createdAt.toISOString(),
    }));
  }

  @Post(':id/decision')
  async decide(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const request = parse(zHumanReviewDecisionRequest, body);
    const review = await this.prisma.humanReview.findUnique({
      where: { id },
      include: { enrollment: true },
    });
    if (!review) throw notFound('Caso de revisión no encontrado');
    if (review.status !== 'pending') {
      throw new AppError('REVIEW_ALREADY_DECIDED', 409, 'Este caso ya fue decidido');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.humanReview.update({
        where: { id },
        data: {
          status: request.decision,
          decidedById: user.id,
          decidedAt: new Date(),
          reason: request.reason,
        },
      });

      // Efecto de la decisión sobre placement (Especificación §13.3).
      if (review.caseType === 'placement' && review.enrollment) {
        if (request.decision === 'confirmed') {
          await tx.enrollment.update({
            where: { id: review.enrollment.id },
            data: { placementProvisional: false, rowVersion: { increment: 1 } },
          });
        } else if (request.decision === 'corrected' && request.correctedValue) {
          const current = (review.enrollment.placement as Record<string, unknown> | null) ?? {};
          await tx.enrollment.update({
            where: { id: review.enrollment.id },
            data: {
              placement: { ...current, ...request.correctedValue } as Prisma.InputJsonObject,
              placementProvisional: false,
              rowVersion: { increment: 1 },
            },
          });
        } else if (request.decision === 'invalidated') {
          await tx.enrollment.update({
            where: { id: review.enrollment.id },
            data: {
              placement: Prisma.JsonNull,
              placementProvisional: true,
              status: 'pending_diagnostic',
              rowVersion: { increment: 1 },
            },
          });
        }
      }

      await this.outboxService.emitInTx(tx, {
        aggregateType: 'human_review',
        aggregateId: review.id,
        eventType: 'human_review.completed',
        payload: { caseType: review.caseType, decision: request.decision },
      });
      await this.auditService.recordInTx(tx, {
        actorId: user.id,
        action: `human_review.${request.decision}`,
        objectType: 'human_review',
        objectId: review.id,
        purpose: request.reason,
      });
    });

    return { ok: true, decision: request.decision };
  }
}
