import { Injectable } from '@nestjs/common';
import type { Enrollment, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { forbidden, notFound } from './errors';
import type { SessionUser } from './session';

export type EnrollmentWithLearner = Enrollment & { learner: User };

/**
 * Regla de aislamiento académico (Arquitectura §10.4): toda consulta de
 * aprendizaje empieza por enrollment y verifica actor → vínculo → enrollment.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertEnrollmentAccess(actor: SessionUser, enrollmentId: string): Promise<EnrollmentWithLearner> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { learner: true },
    });
    if (!enrollment) throw notFound('Inscripción no encontrada');

    if (actor.role === 'staff') return enrollment;
    if (actor.id === enrollment.learnerId) return enrollment;

    if (actor.role === 'guardian') {
      const link = await this.prisma.guardianLearnerLink.findFirst({
        where: { guardianId: actor.id, learnerId: enrollment.learnerId, status: 'active' },
      });
      if (link) return enrollment;
    }
    throw forbidden();
  }

  async assertGuardianOfLearner(actor: SessionUser, learnerId: string): Promise<void> {
    if (actor.role === 'staff') return;
    const link = await this.prisma.guardianLearnerLink.findFirst({
      where: { guardianId: actor.id, learnerId, status: 'active' },
    });
    if (!link) throw forbidden('No existe un vínculo activo con este alumno');
  }
}
