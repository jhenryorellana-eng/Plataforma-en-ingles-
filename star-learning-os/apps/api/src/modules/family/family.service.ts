import { createHmac, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { GrantConsentsRequest, InvitationResponse, OnboardingStatus } from '@star/contracts';
import { isMinor } from '@star/domain';
import type { SessionUser } from '../../common/session';
import { AppError, notFound } from '../../common/errors';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';
import { PrismaService } from '../../prisma/prisma.service';
import { weeklyVoiceMinutesUsed } from '../voice/voice-usage';
import { loadConfig } from '../../config/config';
import { lockLearnerPolicy } from '../../common/learner-policy-lock';
import { ACTIVE_ASSENT_NOTICE_VERSION, ACTIVE_CONSENT_NOTICE_VERSION, INVITATION_TTL_MS, REQUIRED_LEARNING_CONSENTS } from './family-policy';

/** Código legible sin caracteres ambiguos (0/O, 1/I). */
export function invitationCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => alphabet[randomInt(alphabet.length)]).join('');
}

export function normalizeGuardianEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function invitationCodeHash(code: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`guardian-invitation:v1:${code.trim().toUpperCase()}`)
    .digest('hex');
}

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  async createInvitation(learnerId: string, guardianEmail: string): Promise<InvitationResponse> {
    const code = invitationCode();
    const normalizedEmail = normalizeGuardianEmail(guardianEmail);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);
    const codeHash = invitationCodeHash(code, loadConfig().sessionSecret);
    const created = await this.prisma.$transaction(async (tx) => {
      await lockLearnerPolicy(tx, learnerId);
      await tx.guardianInvitation.updateMany({ where: { learnerId, status: 'pending' }, data: { status: 'expired' } });
      const invitation = await tx.guardianInvitation.create({
        data: { learnerId, guardianEmail: normalizedEmail, code: null, codeHash, expiresAt },
      });
      await this.outboxService.emitInTx(tx, { aggregateType: 'learner', aggregateId: learnerId, eventType: 'guardian.invited', payload: {} });
      await this.auditService.recordInTx(tx, { actorId: learnerId, action: 'guardian.invited', objectType: 'guardian_invitation', objectId: invitation.id });
      return invitation;
    });
    return { code, guardianEmail: created.guardianEmail, status: 'pending', expiresAt: created.expiresAt.toISOString() };
  }

  async acceptInvitation(guardian: SessionUser, code: string): Promise<{ learnerId: string; learnerName: string }> {
    const normalizedCode = code.trim().toUpperCase();
    const codeHash = invitationCodeHash(normalizedCode, loadConfig().sessionSecret);
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.guardianInvitation.findFirst({
        where: { codeHash, status: 'pending', expiresAt: { gt: new Date() } }, include: { learner: true },
      });
      if (!invitation) throw notFound('Código de invitación no válido, expirado o ya usado');
      await lockLearnerPolicy(tx, invitation.learnerId);
      const guardianUser = await tx.user.findUniqueOrThrow({ where: { id: guardian.id } });
      if (normalizeGuardianEmail(guardianUser.email ?? '') !== invitation.guardianEmail) {
        throw new AppError('FORBIDDEN', 403, 'Este código fue enviado a otro correo');
      }
      const consumed = await tx.guardianInvitation.updateMany({
        where: { id: invitation.id, status: 'pending', expiresAt: { gt: new Date() } },
        data: { status: 'accepted', acceptedAt: new Date() },
      });
      if (consumed.count !== 1) throw notFound('Código de invitación ya usado');
      await tx.guardianLearnerLink.upsert({
        where: { guardianId_learnerId: { guardianId: guardian.id, learnerId: invitation.learnerId } },
        create: { guardianId: guardian.id, learnerId: invitation.learnerId, status: 'active' },
        update: { status: 'active', revokedAt: null },
      });
      await this.outboxService.emitInTx(tx, { aggregateType: 'learner', aggregateId: invitation.learnerId, eventType: 'guardian.linked', payload: {} });
      await this.auditService.recordInTx(tx, { actorId: guardian.id, action: 'guardian.linked', objectType: 'learner', objectId: invitation.learnerId });
      return { learnerId: invitation.learnerId, learnerName: invitation.learner.displayName };
    });
  }

  async onboardingStatus(learner: SessionUser): Promise<OnboardingStatus> {
    const now = new Date();
    await this.prisma.guardianInvitation.updateMany({
      where: { learnerId: learner.id, status: 'pending', expiresAt: { lte: now } },
      data: { status: 'expired' },
    });
    // Unknown age is handled with the stricter juvenile posture until the
    // profile is repaired; it must never inherit adult readiness.
    const ageBandKnown = learner.ageBand !== null;
    const minor = learner.ageBand === null || isMinor(learner.ageBand);
    const [link, consents, assent, invitation] = await Promise.all([
      this.prisma.guardianLearnerLink.findFirst({ where: { learnerId: learner.id, status: 'active' } }),
      this.prisma.consentGrant.findMany({
        where: { learnerId: learner.id, status: 'granted', noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION },
        select: { purpose: true }, distinct: ['purpose'],
      }),
      this.prisma.youthAssent.findFirst({
        where: { learnerId: learner.id, noticeVersion: ACTIVE_ASSENT_NOTICE_VERSION, revokedAt: null },
      }),
      this.prisma.guardianInvitation.findFirst({ where: { learnerId: learner.id }, orderBy: { createdAt: 'desc' } }),
    ]);
    const purposes = consents.map((consent) => consent.purpose);
    const learningConsents = REQUIRED_LEARNING_CONSENTS.every((purpose) => purposes.includes(purpose));
    return {
      ageBand: learner.ageBand,
      isMinor: minor,
      hasActiveLink: link !== null,
      consents: purposes,
      hasAssent: assent !== null,
      invitation: invitation ? {
        code: null,
        guardianEmail: invitation.guardianEmail,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
      } : null,
      readyToEnroll: ageBandKnown && (!minor || (link !== null && learningConsents && assent !== null)),
    };
  }

  async grantConsents(guardianId: string, request: GrantConsentsRequest, retry = true): Promise<{ granted: string[] }> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockLearnerPolicy(tx, request.learnerId);
        await this.assertActiveGuardianLinkInTx(tx, guardianId, request.learnerId);
        const granted: string[] = [];
        for (const purpose of [...new Set(request.purposes)]) {
          await tx.consentGrant.updateMany({
            where: { learnerId: request.learnerId, purpose, status: 'granted', noticeVersion: { not: ACTIVE_CONSENT_NOTICE_VERSION } },
            data: { status: 'expired', revokedAt: new Date() },
          });
          const existing = await tx.consentGrant.findFirst({
            where: { learnerId: request.learnerId, purpose, status: 'granted', noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION },
          });
          if (!existing) {
            await tx.consentGrant.create({
              data: { learnerId: request.learnerId, grantedById: guardianId, purpose, noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION },
            });
            granted.push(purpose);
          }
        }
        await this.outboxService.emitInTx(tx, {
          aggregateType: 'learner', aggregateId: request.learnerId, eventType: 'consent.granted',
          payload: { purposes: request.purposes, noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION },
        });
        await this.auditService.recordInTx(tx, {
          actorId: guardianId, action: 'consent.granted', objectType: 'learner', objectId: request.learnerId,
          metadata: { purposes: request.purposes, noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION },
        });
        return { granted };
      });
    } catch (error) {
      if (retry && error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034')) {
        return this.grantConsents(guardianId, request, false);
      }
      throw error;
    }
  }

  async revokeConsent(guardianId: string, learnerId: string, purpose: GrantConsentsRequest['purposes'][number]): Promise<{ revoked: string }> {
    return this.prisma.$transaction(async (tx) => {
      await lockLearnerPolicy(tx, learnerId);
      await this.assertActiveGuardianLinkInTx(tx, guardianId, learnerId);
      const now = new Date();
      const updated = await tx.consentGrant.updateMany({
        where: { learnerId, purpose, status: 'granted', noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION },
        data: { status: 'revoked', revokedAt: now },
      });
      if (updated.count === 0) throw notFound('No hay un consentimiento vigente de esa finalidad');
      if (purpose === 'service' || purpose === 'storage') {
        await tx.authSession.updateMany({ where: { userId: learnerId, revokedAt: null }, data: { revokedAt: now } });
      }
      if (purpose === 'ai_voice' || purpose === 'international_transfer') {
        await tx.voiceSession.updateMany({
          where: { enrollment: { learnerId }, status: { in: ['created', 'connected'] } },
          data: { status: 'terminated', endedAt: now, endReason: 'consent_revoked' },
        });
      }
      await this.outboxService.emitInTx(tx, { aggregateType: 'learner', aggregateId: learnerId, eventType: 'consent.revoked', payload: { purpose } });
      await this.auditService.recordInTx(tx, { actorId: guardianId, action: 'consent.revoked', objectType: 'learner', objectId: learnerId, metadata: { purpose } });
      return { revoked: purpose };
    });
  }

  async recordAssent(learnerId: string): Promise<{ ok: true }> {
    await this.prisma.$transaction(async (tx) => {
      await lockLearnerPolicy(tx, learnerId);
      const existing = await tx.youthAssent.findFirst({ where: { learnerId, noticeVersion: ACTIVE_ASSENT_NOTICE_VERSION, revokedAt: null } });
      if (!existing) {
        await tx.youthAssent.create({ data: { learnerId, noticeVersion: ACTIVE_ASSENT_NOTICE_VERSION } });
        await this.outboxService.emitInTx(tx, { aggregateType: 'learner', aggregateId: learnerId, eventType: 'assent.recorded', payload: { noticeVersion: ACTIVE_ASSENT_NOTICE_VERSION } });
        await this.auditService.recordInTx(tx, { actorId: learnerId, action: 'assent.recorded', objectType: 'learner', objectId: learnerId });
      }
    });
    return { ok: true };
  }

  async revokeCurrentAssent(learnerId: string): Promise<{ revoked: true }> {
    await this.prisma.$transaction(async (tx) => {
      await lockLearnerPolicy(tx, learnerId);
      const updated = await tx.youthAssent.updateMany({
        where: { learnerId, noticeVersion: ACTIVE_ASSENT_NOTICE_VERSION, revokedAt: null }, data: { revokedAt: new Date() },
      });
      if (updated.count === 0) throw notFound('No hay asentimiento vigente');
      await this.outboxService.emitInTx(tx, { aggregateType: 'learner', aggregateId: learnerId, eventType: 'assent.revoked', payload: {} });
      await this.auditService.recordInTx(tx, { actorId: learnerId, action: 'assent.revoked', objectType: 'learner', objectId: learnerId });
    });
    return { revoked: true };
  }

  async revokeOwnLink(guardianId: string, learnerId: string): Promise<{ revoked: true }> {
    await this.prisma.$transaction(async (tx) => {
      await lockLearnerPolicy(tx, learnerId);
      const now = new Date();
      const link = await tx.guardianLearnerLink.updateMany({
        where: { guardianId, learnerId, status: 'active' }, data: { status: 'revoked', revokedAt: now },
      });
      if (link.count === 0) throw notFound('No existe ese vínculo activo');
      await tx.guardianInvitation.updateMany({ where: { learnerId, status: 'pending' }, data: { status: 'expired' } });
      await tx.consentGrant.updateMany({
        where: { learnerId, grantedById: guardianId, status: 'granted' }, data: { status: 'revoked', revokedAt: now },
      });
      const remainingGuardians = await tx.guardianLearnerLink.count({ where: { learnerId, status: 'active' } });
      if (remainingGuardians === 0) {
        await tx.authSession.updateMany({ where: { userId: learnerId, revokedAt: null }, data: { revokedAt: now } });
      }
      await tx.voiceSession.updateMany({
        where: { enrollment: { learnerId }, status: { in: ['created', 'connected'] } },
        data: { status: 'terminated', endedAt: now, endReason: 'guardian_link_revoked' },
      });
      await this.outboxService.emitInTx(tx, { aggregateType: 'learner', aggregateId: learnerId, eventType: 'guardian.unlinked', payload: {} });
      await this.auditService.recordInTx(tx, { actorId: guardianId, action: 'guardian.unlinked', objectType: 'learner', objectId: learnerId });
    });
    return { revoked: true };
  }

  private async assertActiveGuardianLinkInTx(
    tx: Prisma.TransactionClient,
    guardianId: string,
    learnerId: string,
  ): Promise<void> {
    const link = await tx.guardianLearnerLink.findFirst({
      where: { guardianId, learnerId, status: 'active' },
      select: { id: true },
    });
    if (!link) {
      throw new AppError('FORBIDDEN', 403, 'No existe un vínculo activo con este alumno');
    }
  }

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
        where: {
          learnerId: learner.id,
          status: 'granted',
          noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION,
        },
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
