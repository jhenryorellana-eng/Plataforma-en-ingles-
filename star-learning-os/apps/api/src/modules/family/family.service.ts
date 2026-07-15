import { Injectable } from '@nestjs/common';
import type { GrantConsentsRequest } from '@star/contracts';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { weeklyVoiceMinutesUsed } from '../voice/voice-usage';

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async grantConsents(guardianId: string, request: GrantConsentsRequest): Promise<{ granted: string[] }> {
    const granted: string[] = [];
    for (const purpose of request.purposes) {
      const existing = await this.prisma.consentGrant.findFirst({
        where: { learnerId: request.learnerId, purpose, status: 'granted' },
      });
      if (!existing) {
        await this.prisma.consentGrant.create({
          data: {
            learnerId: request.learnerId,
            grantedById: guardianId,
            purpose,
            noticeVersion: request.noticeVersion,
          },
        });
        granted.push(purpose);
      }
    }
    await this.auditService.record({
      actorId: guardianId,
      action: 'consent.granted',
      objectType: 'learner',
      objectId: request.learnerId,
      metadata: { purposes: request.purposes },
    });
    return { granted };
  }

  async recordAssent(learnerId: string, noticeVersion: string): Promise<{ ok: true }> {
    const existing = await this.prisma.youthAssent.findFirst({
      where: { learnerId, noticeVersion },
    });
    if (!existing) {
      await this.prisma.youthAssent.create({ data: { learnerId, noticeVersion } });
      await this.auditService.record({
        actorId: learnerId,
        action: 'assent.recorded',
        objectType: 'learner',
        objectId: learnerId,
      });
    }
    return { ok: true };
  }

  /**
   * Resumen familiar (Especificación §5.3): progreso, carga, permisos y alertas.
   * Nunca transcripciones ni contenido de casos de protección.
   */
  async guardianSummary(guardianId: string): Promise<unknown> {
    const links = await this.prisma.guardianLearnerLink.findMany({
      where: { guardianId, status: 'active' },
      include: { learner: true },
    });

    const learners = [];
    for (const link of links) {
      const learner = link.learner;
      const enrollments = await this.prisma.enrollment.findMany({
        where: { learnerId: learner.id, status: { in: ['pending_diagnostic', 'active', 'paused'] } },
        include: { program: true, entitlement: true },
      });
      const consents = await this.prisma.consentGrant.findMany({
        where: { learnerId: learner.id, status: 'granted' },
        select: { purpose: true },
      });
      const openSafetyCases = await this.prisma.safetySignal.count({
        where: { learnerId: learner.id, status: { not: 'resolved' } },
      });
      const pendingReviews = await this.prisma.humanReview.count({
        where: { learnerId: learner.id, status: 'pending' },
      });

      const enrollmentSummaries = [];
      for (const enrollment of enrollments) {
        const [masteredCount, totalCount, usedMinutes] = await Promise.all([
          this.prisma.competencyStateRecord.count({
            where: { enrollmentId: enrollment.id, state: 'mastered' },
          }),
          this.prisma.competency.count({ where: { programVersionId: enrollment.programVersionId } }),
          weeklyVoiceMinutesUsed(this.prisma, enrollment.id),
        ]);
        enrollmentSummaries.push({
          enrollmentId: enrollment.id,
          program: enrollment.program.name,
          paceCode: enrollment.paceCode,
          status: enrollment.status,
          masteredCount,
          totalCount,
          voice: {
            usedMinutes,
            includedMinutes: enrollment.entitlement?.weeklyVoiceMinutes ?? 0,
          },
        });
      }

      learners.push({
        learnerId: learner.id,
        displayName: learner.displayName,
        ageBand: learner.ageBand,
        consents: consents.map((c) => c.purpose),
        openSafetyCases,
        pendingReviews,
        enrollments: enrollmentSummaries,
      });
    }
    return { learners };
  }
}
