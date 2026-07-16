import { Injectable } from '@nestjs/common';
import type { AgeBand, User } from '@prisma/client';
import type {
  DevLoginRequest,
  LoginRequest,
  RegisterGuardianRequest,
  RegisterLearnerRequest,
} from '@star/contracts';
import { AppError } from '../../common/errors';
import { loadConfig } from '../../config/config';
import { PrismaService } from '../../prisma/prisma.service';
import { buildIdentityProvider, type IdentityProvider } from './identity-providers';

const MINIMUM_AGE = 12;

/** Emails fijos de la familia demo creada por el seed. */
export const DEMO_EMAILS = {
  learner_teen: 'diego@demo.starbiz.pe',
  learner_young: 'lucia@demo.starbiz.pe',
  guardian: 'ana@demo.starbiz.pe',
  staff: 'rivas@demo.starbiz.pe',
} as const;

/**
 * Autenticación con contraseña vía IdentityProvider (Supabase Auth en producción,
 * mock en desarrollo). Registro instantáneo sin verificación de correo (decisión
 * de Henry 2026-07-16); el correo se usa para recuperar la contraseña.
 */
@Injectable()
export class AuthService {
  private readonly identity: IdentityProvider;
  private readonly devLoginEnabled: boolean;

  constructor(private readonly prisma: PrismaService) {
    const config = loadConfig();
    this.identity = buildIdentityProvider(config);
    this.devLoginEnabled = config.devLoginEnabled;
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

  /** Inicio de sesión con correo y contraseña. */
  async login(request: LoginRequest): Promise<User> {
    const { authId } = await this.identity.signIn(request.email, request.password);
    const user =
      (await this.prisma.user.findUnique({ where: { authId } })) ??
      (await this.prisma.user.findUnique({ where: { email: request.email } }));
    if (!user) {
      throw new AppError('NOT_FOUND', 404, 'Tu cuenta no tiene perfil en la plataforma. Contáctanos.');
    }
    if (user.authId !== authId) {
      // El proveedor que validó la contraseña es la autoridad: re-vincula cuentas
      // previas (seed o creadas cuando regía otro proveedor de identidad).
      return this.prisma.user.update({ where: { id: user.id }, data: { authId } });
    }
    return user;
  }

  /** Recuperación de contraseña. Siempre responde igual: no revela si el correo existe. */
  async forgotPassword(email: string): Promise<void> {
    await this.identity.sendPasswordRecovery(email);
  }

  /**
   * Age gate del registro (Stack §5.4 nivel A0: edad declarada). La plataforma
   * es 12+ (D16); la banda determina permisos, gates y experiencia.
   */
  async registerLearner(request: RegisterLearnerRequest): Promise<User> {
    const age = new Date().getFullYear() - request.birthYear;
    if (age < MINIMUM_AGE) {
      throw new AppError(
        'AGE_NOT_ALLOWED',
        403,
        'StarbizAcademy está diseñada para estudiantes desde los 12 años',
      );
    }
    const ageBand: AgeBand = age <= 13 ? 'y12_13' : age <= 17 ? 't14_17' : 'a18_plus';

    await this.ensureEmailFree(request.email, 'learner');
    const { authId } = await this.identity.signUp(request.email, request.password);
    return this.prisma.user.create({
      data: { displayName: request.displayName, email: request.email, authId, role: 'learner', ageBand },
    });
  }

  async registerGuardian(request: RegisterGuardianRequest): Promise<User> {
    await this.ensureEmailFree(request.email, 'guardian');
    const { authId } = await this.identity.signUp(request.email, request.password);
    return this.prisma.user.create({
      data: { displayName: request.displayName, email: request.email, authId, role: 'guardian' },
    });
  }

  /** El registro jamás abre sesión sobre una cuenta existente: eso es del login. */
  private async ensureEmailFree(email: string, role: 'learner' | 'guardian'): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      const detail =
        existing.role === role
          ? 'Ese correo ya tiene una cuenta. Inicia sesión.'
          : 'Ese correo ya está registrado con otro rol';
      throw new AppError('VALIDATION_FAILED', 409, detail);
    }
  }
}
