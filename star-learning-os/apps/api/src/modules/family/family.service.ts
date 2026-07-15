import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { GrantConsentsRequest, InvitationResponse, OnboardingStatus } from '@star/contracts';
import { isMinor } from '@star/domain';
import type { SessionUser } from '../../common/session';
import { AppError, notFound } from '../../common/errors';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';
import { PrismaService } from '../../prisma/prisma.service';
import { weeklyVoiceMinutesUsed } from '../voice/voice-usage';

/** Código legible sin caracteres ambiguos (0/O, 1/I). */
function invitationCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  /** El alumno invita a su apoderado (Stack §5.2 paso 2). */
  async createInvitation(learnerId: string, guardianEmail: string): Promise<InvitationResponse> {
    const existing = await this.prisma.guardianInvitation.findFirst({
      where: { learnerId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return { code: existing.code, guardianEmail: existing.guardianEmail, status: existing.status };
    }
    const invitation = await this.prisma.guardianInvitation.create({
      data: { learnerId, guardianEmail, code: invitationCode() },
    });
    await this.outboxService.emitInTx(this.prisma, {
      aggregateType: 'learner',
      aggregateId: learnerId,
      eventType: 'guardian.invited',
      payload: {},
    });
    await this.auditService.record({
      actorId: learnerId,
      action: 'guardian.invited',
      objectType: 'guardian_invitation',
      objectId: invitation.id,
    });
    return { code: invitation.code, guardianEmail, status: 'pending' };
  }

  /**
   * El apoderado acepta con el código (nivel A1 de age assurance; el proveedor
   * A2 de verificación de identidad es un bloqueador externo pendiente).
   */
  async acceptInvitation(guardian: SessionUser, code: string): Promise<{ learnerId: string; learnerName: string }> {
    const invitation = await this.prisma.guardianInvitation.findFirst({
      where: { code: code.toUpperCase(), status: 'pending' },
      include: { learner: true },
    });
    if (!invitation) throw notFound('Código de invitación no válido o ya usado');

    await this.prisma.$transaction(async (tx) => {
      await tx.guardianLearnerLink.upsert({
        where: {
          guardianId_learnerId: { guardianId: guardian.id, learnerId: invitation.learnerId },
        },
        create: { guardianId: guardian.id, learnerId: invitation.learnerId, status: 'active' },
        update: { status: 'active', revokedAt: null },
      });
      await tx.guardianInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      });
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'learner',
        aggregateId: invitation.learnerId,
        eventType: 'guardian.linked',
        payload: {},
      });
      await this.auditService.recordInTx(tx, {
        actorId: guardian.id,
        action: 'guardian.linked',
        objectType: 'learner',
        objectId: invitation.learnerId,
      });
    });
    return { learnerId: invitation.learnerId, learnerName: invitation.learner.displayName };
  }

  /** Estado del onboarding del alumno: guía la UI paso a paso (Especificación §5.2). */
  async onboardingStatus(learner: SessionUser): Promise<OnboardingStatus> {
    const minor = learner.ageBand ? isMinor(learner.ageBand) : false;
    const [link, consents, assent, invitation] = await Promise.all([
      this.prisma.guardianLearnerLink.findFirst({
        where: { learnerId: learner.id, status: 'active' },
      }),
      this.prisma.consentGrant.findMany({
        where: { learnerId: learner.id, status: 'granted' },
        select: { purpose: true },
        distinct: ['purpose'],
      }),
      this.prisma.youthAssent.findFirst({ where: { learnerId: learner.id } }),
      this.prisma.guardianInvitation.findFirst({
        where: { learnerId: learner.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const purposes = consents.map((c) => c.purpose);
    return {
      ageBand: learner.ageBand,
      isMinor: minor,
      hasActiveLink: link !== null,
      consents: purposes,
      hasAssent: assent !== null,
      invitation: invitation
        ? { code: invitation.code, guardianEmail: invitation.guardianEmail, status: invitation.status }
        : null,
      readyToEnroll: !minor || (link !== null && purposes.includes('service')),
    };
  }

  /** Revocación por finalidad (Stack §5.5): impide crear nuevas sesiones de voz. */
  async revokeConsent(guardianId: string, learnerId: string, purpose: GrantConsentsRequest['purposes'][number]): Promise<{ revoked: string }> {
    const updated = await this.prisma.consentGrant.updateMany({
      where: { learnerId, purpose, status: 'granted' },
      data: { status: 'revoked', revokedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new AppError('NOT_FOUND', 404, 'No hay un consentimiento vigente de esa finalidad');
    }
    await this.outboxService.emitInTx(this.prisma, {
      aggregateType: 'learner',
      aggregateId: learnerId,
      eventType: 'consent.revoked',
      payload: { purpose },
    });
    await this.auditService.record({
      actorId: guardianId,
      action: 'consent.revoked',
      objectType: 'learner',
      objectId: learnerId,
      metadata: { purpose },
    });
    return { revoked: purpose };
  }

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
