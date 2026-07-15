import { Injectable } from '@nestjs/common';
import type { CreateEnrollmentRequest, EnrollmentResponse, PathResponse, ProgressResponse } from '@star/contracts';
import { PLAN_LIMITS, type CefrLevel, type Skill } from '@star/domain';
import type { EnrollmentWithLearner } from '../../common/access.service';
import { AppError, forbidden } from '../../common/errors';
import type { SessionUser } from '../../common/session';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';
import { PrismaService } from '../../prisma/prisma.service';

export interface PlacementJson {
  overall: CefrLevel;
  perSkill: Partial<Record<Skill, CefrLevel>>;
  confidence: number;
  provisional: boolean;
}

const BAND_MAX_AGE: Record<string, number> = { y12_13: 13, t14_17: 17, a18_plus: 120 };

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
  ) {}

  async create(actor: SessionUser, request: CreateEnrollmentRequest): Promise<EnrollmentResponse> {
    if (actor.role !== 'learner') throw forbidden('Solo un alumno puede inscribirse');

    const program = await this.prisma.languageProgram.findUnique({
      where: { code: request.programCode },
      include: {
        versions: { where: { status: 'published' }, orderBy: { publishedAt: 'desc' }, take: 1 },
      },
    });
    if (!program || program.status !== 'active' || program.versions.length === 0) {
      throw new AppError('PROGRAM_NOT_AVAILABLE', 404, 'El programa no está disponible');
    }
    const version = program.versions[0];

    const ageBand = actor.ageBand ?? 'a18_plus';
    if (program.minimumAge > (BAND_MAX_AGE[ageBand] ?? 120)) {
      throw new AppError('AGE_NOT_ALLOWED', 403, 'Este programa no está habilitado para tu edad');
    }

    // Un enrollment juvenil activo requiere vínculo y consentimientos vigentes (Especificación §15.3).
    if (ageBand !== 'a18_plus') {
      const link = await this.prisma.guardianLearnerLink.findFirst({
        where: { learnerId: actor.id, status: 'active' },
      });
      if (!link) {
        throw new AppError('GUARDIAN_LINK_REQUIRED', 403, 'Necesitas un apoderado vinculado para inscribirte');
      }
      const serviceConsent = await this.prisma.consentGrant.findFirst({
        where: { learnerId: actor.id, purpose: 'service', status: 'granted' },
      });
      if (!serviceConsent) {
        throw new AppError('CONSENT_REQUIRED', 403, 'Tu apoderado debe autorizar el servicio primero', {
          purpose: 'service',
        });
      }
    }

    const existing = await this.prisma.enrollment.findFirst({
      where: {
        learnerId: actor.id,
        programId: program.id,
        status: { in: ['pending_diagnostic', 'active', 'paused'] },
      },
    });
    if (existing) {
      throw new AppError('ENROLLMENT_ALREADY_EXISTS', 409, 'Ya tienes una inscripción activa en este programa', {
        enrollmentId: existing.id,
      });
    }

    const limits = PLAN_LIMITS[request.paceCode];
    const enrollment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.enrollment.create({
        data: {
          learnerId: actor.id,
          programId: program.id,
          programVersionId: version.id,
          paceCode: request.paceCode,
          supportLanguage: request.supportLanguage,
          interfaceLocale: request.interfaceLocale,
          targetVariety: request.targetVariety,
        },
      });
      await tx.entitlement.create({
        data: {
          enrollmentId: created.id,
          weeklyVoiceMinutes: limits.weeklyVoiceMinutes,
          weeklyStudyHours: limits.weeklyStudyHours,
        },
      });
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'enrollment',
        aggregateId: created.id,
        eventType: 'enrollment.created',
        payload: { programCode: program.code, paceCode: request.paceCode },
      });
      await this.auditService.recordInTx(tx, {
        actorId: actor.id,
        action: 'enrollment.created',
        objectType: 'enrollment',
        objectId: created.id,
      });
      return created;
    });

    return this.toResponse(enrollment.id);
  }

  async listMine(actor: SessionUser): Promise<EnrollmentResponse[]> {
    let learnerIds: string[];
    if (actor.role === 'learner') {
      learnerIds = [actor.id];
    } else if (actor.role === 'guardian') {
      const links = await this.prisma.guardianLearnerLink.findMany({
        where: { guardianId: actor.id, status: 'active' },
        select: { learnerId: true },
      });
      learnerIds = links.map((link) => link.learnerId);
    } else {
      learnerIds = [];
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: actor.role === 'staff' ? {} : { learnerId: { in: learnerIds } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true },
    });
    return Promise.all(enrollments.map((enrollment) => this.toResponse(enrollment.id)));
  }

  async toResponse(enrollmentId: string): Promise<EnrollmentResponse> {
    const enrollment = await this.prisma.enrollment.findUniqueOrThrow({
      where: { id: enrollmentId },
      include: { program: true, programVersion: true },
    });
    const placement = (enrollment.placement as unknown as PlacementJson | null) ?? null;
    const nextAction =
      enrollment.status === 'pending_diagnostic'
        ? ({ type: 'start_diagnostic', href: `/v1/enrollments/${enrollment.id}/diagnostic-attempts` } as const)
        : ({ type: 'today', href: `/v1/enrollments/${enrollment.id}/today` } as const);
    return {
      id: enrollment.id,
      program: {
        code: enrollment.program.code,
        version: enrollment.programVersion.version,
        targetLanguage: enrollment.program.targetLanguage,
      },
      paceCode: enrollment.paceCode,
      status: enrollment.status,
      placement: placement
        ? {
            overall: placement.overall,
            perSkill: placement.perSkill as Record<string, CefrLevel>,
            confidence: placement.confidence,
            provisional: enrollment.placementProvisional,
          }
        : null,
      nextAction,
    };
  }

  async progress(enrollment: EnrollmentWithLearner): Promise<ProgressResponse> {
    const competencies = await this.prisma.competency.findMany({
      where: { programVersionId: enrollment.programVersionId },
      select: { id: true, skill: true, criticality: true },
    });
    const states = await this.prisma.competencyStateRecord.findMany({
      where: { enrollmentId: enrollment.id },
    });
    const stateByCompetency = new Map(states.map((state) => [state.competencyId, state]));

    const total = competencies.length;
    const covered = states.filter((state) => state.evidenceCount > 0).length;
    const mastered = states.filter((state) => state.state === 'mastered').length;
    const reviewRequired = states.filter((state) => state.state === 'review_required').length;

    const criticalCompetencies = competencies.filter((c) => c.criticality === 'critical');
    const complementaryCompetencies = competencies.filter((c) => c.criticality === 'complementary');
    const isMastered = (competencyId: string): boolean =>
      stateByCompetency.get(competencyId)?.state === 'mastered';

    const skills: Skill[] = ['reading', 'listening', 'speaking', 'writing', 'language_use'];
    const perSkill = skills
      .map((skill) => {
        const ofSkill = competencies.filter((c) => c.skill === skill);
        return {
          skill,
          mastered: ofSkill.filter((c) => isMastered(c.id)).length,
          total: ofSkill.length,
        };
      })
      .filter((entry) => entry.total > 0);

    const placement = (enrollment.placement as unknown as PlacementJson | null) ?? null;
    const everMastered = mastered + reviewRequired;

    return {
      enrollmentId: enrollment.id,
      coverage: total === 0 ? 0 : round2(covered / total),
      mastery: total === 0 ? 0 : round2(mastered / total),
      retention: everMastered === 0 ? 0 : round2(mastered / everMastered),
      readiness: null,
      criticalMastered: criticalCompetencies.filter((c) => isMastered(c.id)).length,
      criticalTotal: criticalCompetencies.length,
      complementaryMastered: complementaryCompetencies.filter((c) => isMastered(c.id)).length,
      complementaryTotal: complementaryCompetencies.length,
      perSkill,
      placement: placement
        ? {
            overall: placement.overall,
            confidence: placement.confidence,
            provisional: enrollment.placementProvisional,
          }
        : null,
    };
  }

  async path(enrollment: EnrollmentWithLearner): Promise<PathResponse> {
    const stages = await this.prisma.stage.findMany({
      where: { programVersionId: enrollment.programVersionId },
      orderBy: { orderIndex: 'asc' },
      include: {
        units: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessonContracts: {
              orderBy: { orderIndex: 'asc' },
              include: { lessonCompetencies: { include: { competency: true } } },
            },
          },
        },
      },
    });
    const states = await this.prisma.competencyStateRecord.findMany({
      where: { enrollmentId: enrollment.id },
    });
    const stateByCompetency = new Map(states.map((state) => [state.competencyId, state.state]));

    return {
      enrollmentId: enrollment.id,
      stages: stages.map((stage) => ({
        code: stage.code,
        name: stage.name,
        units: stage.units.map((unit) => {
          const seen = new Set<string>();
          const competencies = [];
          for (const lesson of unit.lessonContracts) {
            for (const lessonCompetency of lesson.lessonCompetencies) {
              const competency = lessonCompetency.competency;
              if (seen.has(competency.id)) continue;
              seen.add(competency.id);
              competencies.push({
                code: competency.code,
                descriptor: competency.descriptor,
                skill: competency.skill,
                criticality: competency.criticality,
                state: stateByCompetency.get(competency.id) ?? ('not_seen' as const),
              });
            }
          }
          return { code: unit.code, name: unit.name, competencies };
        }),
      })),
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
