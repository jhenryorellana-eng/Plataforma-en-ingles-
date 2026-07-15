import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { DevLoginRequest } from '@star/contracts';
import { AppError } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';

/** Emails fijos de la familia demo creada por el seed. */
export const DEMO_EMAILS = {
  learner_teen: 'diego@demo.starbiz.pe',
  learner_young: 'lucia@demo.starbiz.pe',
  guardian: 'ana@demo.starbiz.pe',
  staff: 'rivas@demo.starbiz.pe',
} as const;

/**
 * Proveedor de identidad de DESARROLLO. En producción se reemplaza por
 * Google Identity Platform detrás de la misma interfaz (Stack §5.1);
 * este proveedor jamás debe habilitarse fuera de entorno local.
 */
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async devLogin(request: DevLoginRequest): Promise<User> {
    if (request.profile) {
      const email = DEMO_EMAILS[request.profile];
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new AppError('NOT_FOUND', 404, 'Perfil demo no encontrado. Ejecuta `pnpm db:seed` primero.');
      }
      return user;
    }

    if (!request.displayName || !request.role) {
      throw new AppError('VALIDATION_FAILED', 400, 'Indica profile, o displayName y role');
    }
    return this.prisma.user.create({
      data: {
        displayName: request.displayName,
        role: request.role,
        ageBand: request.ageBand ?? (request.role === 'learner' ? 't14_17' : null),
      },
    });
  }
}
