import { Injectable } from '@nestjs/common';
import type { Enrollment, Prisma, StaffCapability, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, forbidden, notFound } from './errors';
import type { SessionUser } from './session';
import {
  ACTIVE_ASSENT_NOTICE_VERSION,
  ACTIVE_CONSENT_NOTICE_VERSION,
  REQUIRED_LEARNING_CONSENTS,
} from '../modules/family/family-policy';

export type EnrollmentWithLearner = Enrollment & { learner: User };
export type StaffEnrollmentAccessPurpose = 'academic_review' | 'safeguarding' | 'operations';

const STAFF_CAPABILITY_BY_PURPOSE: Record<StaffEnrollmentAccessPurpose, StaffCapability> = {
  academic_review: 'academic_reviewer',
  safeguarding: 'safeguarding',
  operations: 'operations',
};

/**
 * Regla de aislamiento académico (Arquitectura §10.4): toda consulta de
 * aprendizaje empieza por enrollment y verifica actor → vínculo → enrollment.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertEnrollmentAccess(
    actor: SessionUser,
    enrollmentId: string,
    staffPurpose?: StaffEnrollmentAccessPurpose,
  ): Promise<EnrollmentWithLearner> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { learner: true },
    });
    if (!enrollment) throw notFound('Inscripción no encontrada');

    if (actor.role === 'learner' && actor.id === enrollment.learnerId) {
      await this.assertYouthLearningEligibility(actor.id, enrollment.learner.ageBand);
      return enrollment;
    }

    // El personal no hereda acceso global a datos académicos por su rol. Cada
    // flujo operativo debe declarar el propósito y la capacidad que lo habilita.
    if (actor.role === 'staff') {
      const requiredCapability = staffPurpose ? STAFF_CAPABILITY_BY_PURPOSE[staffPurpose] : null;
      if (requiredCapability && actor.capabilities.includes(requiredCapability)) return enrollment;
      throw forbidden('No tienes el permiso operativo requerido para esta inscripción');
    }

    if (actor.role === 'guardian') {
      const link = await this.prisma.guardianLearnerLink.findFirst({
        where: { guardianId: actor.id, learnerId: enrollment.learnerId, status: 'active' },
      });
      if (link) return enrollment;
    }
    throw forbidden();
  }

  async assertGuardianOfLearner(actor: SessionUser, learnerId: string): Promise<void> {
    if (actor.role !== 'guardian') {
      throw forbidden('Solo un apoderado vinculado puede realizar esta acción');
    }
    const link = await this.prisma.guardianLearnerLink.findFirst({
      where: { guardianId: actor.id, learnerId, status: 'active' },
    });
    if (!link) throw forbidden('No existe un vínculo activo con este alumno');
  }

  /**
   * Escritura académica (sesiones, submissions, voz): solo la ejecuta el PROPIO
   * alumno. Un apoderado o staff con acceso de lectura jamás genera evidencia,
   * mastery ni recompensas en nombre del menor.
   */
  async assertLearnerSelf(actor: SessionUser, enrollment: Pick<Enrollment, 'learnerId'>): Promise<void> {
    this.assertLearnerIdentity(actor, enrollment);
    await this.assertYouthLearningEligibility(actor.id, actor.ageBand);
  }

  /** Comprobación pura para flujos que ya pasaron el gate juvenil al cargar la inscripción. */
  assertLearnerIdentity(actor: SessionUser, enrollment: Pick<Enrollment, 'learnerId'>): void {
    if (actor.role !== 'learner' || actor.id !== enrollment.learnerId) {
      throw forbidden('Solo el propio alumno puede realizar esta acción');
    }
  }

  /** Dynamic juvenile gate used both at enrollment creation and every learner-self access. */
  async assertYouthLearningEligibility(
    learnerId: string,
    ageBand: User['ageBand'],
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    if (!ageBand) {
      throw new AppError('AGE_NOT_ALLOWED', 403, 'El alumno necesita una banda de edad verificada');
    }
    if (ageBand === 'a18_plus') return;
    const [link, consents, assent] = await Promise.all([
      db.guardianLearnerLink.findFirst({ where: { learnerId, status: 'active' } }),
      db.consentGrant.findMany({
        where: {
          learnerId,
          status: 'granted',
          noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION,
          purpose: { in: REQUIRED_LEARNING_CONSENTS },
        },
        select: { purpose: true },
      }),
      db.youthAssent.findFirst({
        where: { learnerId, noticeVersion: ACTIVE_ASSENT_NOTICE_VERSION, revokedAt: null },
      }),
    ]);
    if (!link) throw new AppError('GUARDIAN_LINK_REQUIRED', 403, 'Necesitas un apoderado vinculado');
    const granted = new Set(consents.map((consent) => consent.purpose));
    const missing = REQUIRED_LEARNING_CONSENTS.find((purpose) => !granted.has(purpose));
    if (missing) {
      throw new AppError('CONSENT_REQUIRED', 403, 'Falta un consentimiento vigente para aprender', {
        purpose: missing,
      });
    }
    if (!assent) {
      throw new AppError('ASSENT_REQUIRED', 403, 'Primero confirma el asentimiento vigente');
    }
  }
}
