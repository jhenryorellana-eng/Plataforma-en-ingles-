import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type AgeBand, type StaffCapability, type User } from '@prisma/client';
import type {
  DevLoginRequest,
  LoginRequest,
  RegisterGuardianRequest,
  RegisterGuardianResponse,
  RegisterLearnerRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '@star/contracts';
import { ageBandForBirthYear } from '@star/domain';
import { AppError } from '../../common/errors';
import { loadConfig } from '../../config/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildIdentityProvider,
  REGISTRATION_CONFLICT_MESSAGE,
  type IdentityProvider,
} from './identity-providers';

export { REGISTRATION_CONFLICT_MESSAGE } from './identity-providers';

/** Emails fijos de la familia demo creada por el seed. */
export const DEMO_EMAILS = {
  learner_teen: 'diego@demo.starbiz.pe',
  learner_young: 'lucia@demo.starbiz.pe',
  guardian: 'ana@demo.starbiz.pe',
  staff: 'rivas@demo.starbiz.pe',
} as const;

const PASSWORD_RECOVERY_ROUTE = '/v1/auth/reset-password';

export interface CredentialLogin {
  user: User;
  /** Versión observada antes de validar la contraseña fuera de la BD. */
  credentialVersion: number;
}

/**
 * Autenticación con contraseña vía IdentityProvider (Supabase Auth en producción,
 * mock en desarrollo). El alumno conserva registro instantáneo; el apoderado
 * debe confirmar su correo antes de poder iniciar sesión.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly identity: IdentityProvider;
  private readonly devLoginEnabled: boolean;
  private readonly webOrigin: string;

  constructor(private readonly prisma: PrismaService) {
    const config = loadConfig();
    this.identity = buildIdentityProvider(config);
    this.devLoginEnabled = config.devLoginEnabled;
    this.webOrigin = config.webOrigin.replace(/\/$/, '');
  }

  get identityProviderName(): string {
    return this.identity.name;
  }

  /** Acceso demo sin contraseña: SOLO entornos de desarrollo (jamás producción). */
  async devLogin(request: DevLoginRequest): Promise<User> {
    if (!this.devLoginEnabled) {
      throw new AppError('FORBIDDEN', 403, 'El acceso demo está deshabilitado en producción');
    }
    if (request.profile) {
      const email = DEMO_EMAILS[request.profile];
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new AppError(
          'NOT_FOUND',
          404,
          'Perfil demo no encontrado. Ejecuta `pnpm db:seed` primero.',
        );
      }
      return user;
    }

    if (!request.displayName || !request.role) {
      throw new AppError('VALIDATION_FAILED', 400, 'Indica profile, o displayName y role');
    }
    const user = await this.prisma.user.create({
      data: {
        displayName: request.displayName,
        role: request.role,
        ageBand: request.ageBand ?? (request.role === 'learner' ? 't14_17' : null),
      },
    });
    if (user.role === 'staff') {
      const capabilities: StaffCapability[] = [
        'curriculum_author',
        'curriculum_publisher',
        'academic_reviewer',
        'safeguarding',
        'operations',
      ];
      await this.prisma.staffGrant.createMany({
        data: capabilities.map((capability) => ({ userId: user.id, capability })),
        skipDuplicates: true,
      });
    }
    return user;
  }

  /** Inicio de sesión con correo y contraseña. */
  async login(request: LoginRequest): Promise<CredentialLogin> {
    const email = normalizeEmail(request.email);
    // La validación de contraseña ocurre fuera de PostgreSQL. Capturamos una
    // versión local antes de ella; SessionService hará el CAS al abrir sesión.
    const userBeforeValidation = await this.prisma.user.findUnique({ where: { email } });
    const { authId } = await this.identity.signIn(email, request.password);
    const identityUser = await this.prisma.user.findUnique({ where: { authId } });
    if (identityUser) {
      if (!userBeforeValidation || identityUser.id !== userBeforeValidation.id) {
        // Sin una versión pre-validación no es posible demostrar que un reset
        // concurrente no ocurrió. Falla cerrado y no abre una sesión STAR.
        throw invalidCredentials();
      }
      return {
        user: identityUser,
        credentialVersion: userBeforeValidation.credentialVersion,
      };
    }

    const user = userBeforeValidation;
    if (!user) {
      throw new AppError(
        'NOT_FOUND',
        404,
        'Tu cuenta no tiene perfil en la plataforma. Contáctanos.',
      );
    }
    if (user.role === 'staff') {
      this.logger.warn(`Se rechazó el re-vínculo automático de un perfil staff (${user.id})`);
      throw invalidCredentials();
    }

    // Un login válido constituye el re-vínculo explícito de perfiles no privilegiados
    // creados antes de integrar el proveedor actual. El CAS impide vincular con
    // una validación que cruzó una barrera de reset. Staff requiere provisión manual.
    const linked = await this.prisma.user.updateMany({
      where: { id: user.id, authId: null, credentialVersion: user.credentialVersion },
      data: { authId },
    });
    if (linked.count !== 1) throw invalidCredentials();
    return {
      user: { ...user, authId },
      credentialVersion: user.credentialVersion,
    };
  }

  /** Recuperación de contraseña. Siempre responde igual: no revela si el correo existe. */
  async forgotPassword(email: string): Promise<void> {
    try {
      await this.identity.sendPasswordRecovery(
        normalizeEmail(email),
        `${this.webOrigin}/es-PE/reset-password`,
      );
    } catch (error) {
      const category = error instanceof AppError ? `${error.code}/${error.status}` : 'UNEXPECTED';
      this.logger.warn(`El proveedor no pudo procesar una recuperación (${category})`);
      // La respuesta pública permanece indistinguible para correos existentes y ausentes.
    }
  }

  async resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const { authId, email } = await this.identity.getUserId(request.accessToken);
    const user =
      (await this.prisma.user.findUnique({ where: { authId } })) ??
      (await this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } }));

    // El JWT de recovery es un bearer: la revocación de refresh tokens de
    // Supabase no basta para convertirlo en one-time. Consumimos su hash y
    // avanzamos la barrera y revocamos sesiones STAR en UNA transacción antes
    // de tocar la contraseña. Otra barrera en finally cierra los logins que
    // validaron durante la llamada de red. Si el proveedor falla después, se
    // solicita un enlace nuevo.
    const tokenHash = createHash('sha256').update(request.accessToken).digest('hex');
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.idempotencyRecord.create({
          data: {
            key: tokenHash,
            route: PASSWORD_RECOVERY_ROUTE,
            requestHash: tokenHash,
          },
        });
        if (user) {
          await tx.user.update({
            where: { id: user.id },
            data: { credentialVersion: { increment: 1 } },
          });
          await tx.authSession.updateMany({
            where: { userId: user.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new AppError(
          'INVALID_CREDENTIALS',
          401,
          'El enlace de recuperación no es válido o ya fue usado.',
        );
      }
      this.logger.error(
        'No se pudo consumir el enlace y revocar las sesiones STAR antes del reset',
      );
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        503,
        'No pudimos proteger el cambio de contraseña. Solicita un enlace nuevo e intenta otra vez.',
      );
    }

    try {
      const updated = await this.identity.updatePassword(request.accessToken, request.password);
      if (updated.authId !== authId) {
        throw new AppError(
          'IDENTITY_PROVIDER_ERROR',
          502,
          'No se pudo validar el cambio de contraseña.',
        );
      }
    } finally {
      if (user) {
        try {
          await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: user.id },
              data: { credentialVersion: { increment: 1 } },
            });
            await tx.authSession.updateMany({
              where: { userId: user.id, revokedAt: null },
              data: { revokedAt: new Date() },
            });
          });
        } catch {
          this.logger.error('No se pudo cerrar la barrera de sesiones STAR tras el reset');
          throw new AppError(
            'SERVICE_UNAVAILABLE',
            503,
            'No pudimos proteger el cambio de contraseña. Intenta iniciar sesión nuevamente.',
          );
        }
      }
    }
    await this.identity.signOutAll(request.accessToken);
    return { ok: true };
  }

  /**
   * Age gate del registro (Stack §5.4 nivel A0: edad declarada). La plataforma
   * es 12+ (D16); la banda determina permisos, gates y experiencia. Con solo el
   * año no sabemos si ya cumplió años: se clasifica con la edad GARANTIZADA
   * (la más restrictiva) — un menor jamás queda clasificado como adulto.
   */
  async registerLearner(request: RegisterLearnerRequest): Promise<User> {
    const ageBand: AgeBand | null = ageBandForBirthYear(
      request.birthYear,
      new Date().getFullYear(),
    );
    if (ageBand === null) {
      throw new AppError(
        'AGE_NOT_ALLOWED',
        403,
        'StarbizAcademy está diseñada para estudiantes desde los 12 años cumplidos',
      );
    }

    const email = normalizeEmail(request.email);
    await this.ensureEmailFree(email);
    const { authId } = await this.identity.signUp(email, request.password);
    try {
      return await this.prisma.user.create({
        data: { displayName: request.displayName, email, authId, role: 'learner', ageBand },
      });
    } catch (error) {
      await this.rollbackIdentity(authId);
      throw error;
    }
  }

  async registerGuardian(request: RegisterGuardianRequest): Promise<RegisterGuardianResponse> {
    const email = normalizeEmail(request.email);
    await this.ensureEmailFree(email);
    const { authId, pendingVerification } = await this.identity.signUpGuardian(
      email,
      request.password,
      `${this.webOrigin}/es-PE/login?verified=1`,
    );
    if (!pendingVerification) {
      await this.rollbackIdentity(authId);
      throw new AppError(
        'IDENTITY_PROVIDER_ERROR',
        503,
        'La verificación de correo no está disponible. Intenta de nuevo más tarde.',
      );
    }
    try {
      await this.prisma.user.create({
        data: { displayName: request.displayName, email, authId, role: 'guardian' },
      });
      return { status: 'pendingVerification' };
    } catch (error) {
      await this.rollbackIdentity(authId);
      throw error;
    }
  }

  /** El registro jamás abre sesión sobre una cuenta existente: eso es del login. */
  private async ensureEmailFree(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('VALIDATION_FAILED', 409, REGISTRATION_CONFLICT_MESSAGE);
    }
  }

  private async rollbackIdentity(authId: string): Promise<void> {
    try {
      await this.identity.deleteUser(authId);
    } catch (error) {
      this.logger.error(
        `No se pudo revertir una cuenta huérfana del proveedor: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function invalidCredentials(): AppError {
  return new AppError('INVALID_CREDENTIALS', 401, 'Correo o contraseña incorrectos');
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') ||
    (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')
  );
}
