import { Injectable } from '@nestjs/common';
import type { CompetencyState, EnrollmentStatus, Skill } from '@prisma/client';
import type { SessionUser } from '../../common/session';
import { PrismaService } from '../../prisma/prisma.service';

export type CompanionLearnerStatus =
  | 'on_track'
  | 'needs_practice'
  | 'needs_support'
  | 'awaiting_start';

type LearnerSignal = {
  enrollmentStatus: EnrollmentStatus;
  pendingReviews: number;
  reviewRequired: number;
  developing: number;
  lastActivityAt: Date | null;
  focusSkill: Skill | null;
};

const SKILL_LABELS: Record<Skill, string> = {
  reading: 'lectura',
  listening: 'comprensión auditiva',
  speaking: 'expresión oral',
  writing: 'escritura',
  language_use: 'gramática y vocabulario',
};

const AGE_LABELS = {
  y12_13: '12–13 años',
  t14_17: '14–17 años',
  a18_plus: '18+ años',
} as const;

const SUPPORT_STATES = new Set<CompetencyState>(['review_required', 'developing', 'provisional']);
const INACTIVITY_DAYS = 7;

export function classifyLearner(signal: LearnerSignal, now = new Date()): CompanionLearnerStatus {
  if (signal.enrollmentStatus === 'pending_diagnostic') return 'awaiting_start';
  if (signal.pendingReviews > 0 || signal.reviewRequired > 0 || signal.enrollmentStatus === 'paused') {
    return 'needs_support';
  }
  const inactiveSince = new Date(now.getTime() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
  if (
    signal.developing > 0 ||
    signal.lastActivityAt === null ||
    signal.lastActivityAt < inactiveSince
  ) {
    return 'needs_practice';
  }
  return 'on_track';
}

function recommendation(status: CompanionLearnerStatus, focusSkill: Skill | null): string {
  const focus = focusSkill ? SKILL_LABELS[focusSkill] : 'su ruta inicial';
  if (status === 'awaiting_start') {
    return 'Acompáñalo a completar el diagnóstico para conocer su punto de partida.';
  }
  if (status === 'needs_support') {
    return `Revisa la evidencia de ${focus} y registra una decisión breve.`;
  }
  if (status === 'needs_practice') {
    return `Conviene reforzar ${focus} con una práctica corta esta semana.`;
  }
  return 'Avanza con normalidad. No necesita una intervención adicional hoy.';
}

@Injectable()
export class CompanionService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(actor: SessionUser): Promise<unknown> {
    const [enrollments, pendingReviews, openSafetyCases] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { status: { in: ['pending_diagnostic', 'active', 'paused'] } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          learner: { select: { id: true, displayName: true, ageBand: true } },
          program: { select: { name: true } },
          programVersion: { select: { competencies: { select: { id: true } } } },
          competencyStates: {
            include: { competency: { select: { skill: true } } },
          },
          evidence: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
          humanReviews: {
            where: { status: 'pending' },
            select: { id: true },
          },
        },
      }),
      this.prisma.humanReview.count({ where: { status: 'pending' } }),
      actor.capabilities.includes('safeguarding')
        ? this.prisma.safetyCase.count({ where: { status: { not: 'resolved' } } })
        : Promise.resolve(0),
    ]);

    const learners = enrollments.map((enrollment) => {
      const problemSkills = new Map<Skill, number>();
      for (const state of enrollment.competencyStates) {
        if (!SUPPORT_STATES.has(state.state)) continue;
        problemSkills.set(
          state.competency.skill,
          (problemSkills.get(state.competency.skill) ?? 0) + 1,
        );
      }
      const focusSkill =
        [...problemSkills.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
      const reviewRequired = enrollment.competencyStates.filter(
        (state) => state.state === 'review_required',
      ).length;
      const developing = enrollment.competencyStates.filter((state) =>
        ['developing', 'provisional'].includes(state.state),
      ).length;
      const mastered = enrollment.competencyStates.filter(
        (state) => state.state === 'mastered',
      ).length;
      const totalCompetencies = enrollment.programVersion.competencies.length;
      const status = classifyLearner({
        enrollmentStatus: enrollment.status,
        pendingReviews: enrollment.humanReviews.length,
        reviewRequired,
        developing,
        lastActivityAt: enrollment.evidence[0]?.createdAt ?? null,
        focusSkill,
      });
      const placement = enrollment.placement as { overall?: string } | null;

      return {
        learnerId: enrollment.learner.id,
        enrollmentId: enrollment.id,
        displayName: enrollment.learner.displayName,
        ageLabel: enrollment.learner.ageBand
          ? AGE_LABELS[enrollment.learner.ageBand]
          : 'Edad pendiente',
        program: enrollment.program.name,
        level: placement?.overall ?? 'Por definir',
        status,
        focus: focusSkill ? SKILL_LABELS[focusSkill] : 'ruta inicial',
        progressPercent:
          totalCompetencies === 0 ? 0 : Math.round((mastered / totalCompetencies) * 100),
        lastActivityAt: enrollment.evidence[0]?.createdAt.toISOString() ?? null,
        recommendation: recommendation(status, focusSkill),
      };
    });

    return {
      summary: {
        learners: learners.length,
        needAttention: learners.filter((learner) => learner.status !== 'on_track').length,
        pendingReviews,
        openSafetyCases,
      },
      learners,
    };
  }
}
