import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  type AgeBand,
  type ConsentPurpose,
  type StaffCapability,
  type User,
} from '@prisma/client';
import type {
  ChangeInitialPasswordRequest,
  CreateManagedLearnerRequest,
  CreateManagedLearnerResponse,
  DevLoginRequest,
  LoginRequest,
  MeResponse,
  RegisterGuardianRequest,
  RegisterGuardianResponse,
  RegisterLearnerRequest,
  ResendConfirmationResponse,
  ResetManagedLearnerPasswordRequest,
  ResetManagedLearnerPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '@star/contracts';
import { ageBandForBirthYear } from '@star/domain';
import { AppError } from '../../common/errors';
import { lockLearnerPolicy } from '../../common/learner-policy-lock';
import type { SessionUser } from '../../common/session';
import { loadConfig } from '../../config/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';
import {
  ACTIVE_ASSENT_NOTICE_VERSION,
  ACTIVE_CONSENT_NOTICE_VERSION,
} from '../family/family-policy';
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
const MANAGED_LEARNER_EMAIL_DOMAIN = 'learners.invalid';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {
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

  /** Inicio de sesión con nombre de acceso o correo y contraseña. */
  async login(request: LoginRequest): Promise<CredentialLogin> {
    const identifier = normalizeIdentifier(request.identifier ?? request.email ?? '');
    if (!identifier) throw invalidCredentials();
    const usesEmail = identifier.includes('@');
    // La validación de contraseña ocurre fuera de PostgreSQL. Capturamos una
    // versión local antes de ella; SessionService hará el CAS al abrir sesión.
    const userBeforeValidation = await this.prisma.user.findUnique({
      where: usesEmail ? { email: identifier } : { loginName: identifier },
    });
    const identityEmail = usesEmail
      ? identifier
      : (userBeforeValidation?.email ?? managedLearnerEmail(identifier));
    const { authId } = await this.identity.signIn(identityEmail, request.password);
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

    if (ageBand !== 'a18_plus') {
      throw new AppError(
        'GUARDIAN_LINK_REQUIRED',
        403,
        'Un padre, madre o apoderado debe crear la cuenta de un menor desde su panel familiar.',
      );
    }

    const email = normalizeEmail(request.email);
    assertContactEmail(email);
    await this.ensureEmailFree(email);
    const { authId } = await this.identity.signUp(email, request.password);
    try {
      return await this.prisma.user.create({
        data: {
          displayName: request.displayName,
          email,
          authId,
          role: 'learner',
          ageBand,
          birthYear: request.birthYear,
        },
      });
    } catch (error) {
      await this.rollbackIdentity(authId);
      throw error;
    }
  }

  async registerGuardian(request: RegisterGuardianRequest): Promise<RegisterGuardianResponse> {
    if (request.adultGuardianAttestation !== true) {
      throw new AppError(
        'VALIDATION_FAILED',
        400,
        'Debes confirmar que eres mayor de edad y que tienes autoridad para registrar al menor.',
      );
    }
    const email = normalizeEmail(request.email);
    assertContactEmail(email);
    await this.ensureEmailFree(email);
    const { authId, pendingVerification } = await this.identity.signUpGuardian(
      email,
      request.password,
      `${this.webOrigin}/es-PE/login?verified=1`,
    );
    if (!pendingVerification) {
      if (authId) await this.rollbackIdentity(authId);
      throw new AppError(
        'IDENTITY_PROVIDER_ERROR',
        503,
        'La verificación de correo no está disponible. Intenta de nuevo más tarde.',
      );
    }

    // Supabase devuelve deliberadamente un usuario falso para ciertos correos
    // ya registrados. Solo se recupera el ID real si estas credenciales acaban
    // de demostrar control de la identidad; de lo contrario no nace perfil local.
    const resolvedAuthId =
      authId ?? (await this.tryRecoverGuardianAuthId(email, request.password));
    if (!resolvedAuthId) return { status: 'pendingVerification' };

    try {
      await this.prisma.user.create({
        data: {
          displayName: request.displayName,
          email,
          authId: resolvedAuthId,
          role: 'guardian',
        },
      });
      return { status: 'pendingVerification' };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        // Otra solicitud pudo haber persistido exactamente esta identidad
        // mientras Supabase respondía. Nunca se borra Auth en esta rama.
        if (await this.reconcileGuardianIdentity(email, resolvedAuthId)) {
          return { status: 'pendingVerification' };
        }
        throw new AppError('VALIDATION_FAILED', 409, REGISTRATION_CONFLICT_MESSAGE);
      }
      // Solo la respuesta fiable del signup demuestra que esta petición creó
      // la identidad. Una identidad recuperada mediante login ya era previa.
      if (authId) await this.rollbackIdentity(authId);
      throw error;
    }
  }

  /** Respuesta indistinguible para cuentas existentes, confirmadas o desconocidas. */
  async resendGuardianConfirmation(emailInput: string): Promise<ResendConfirmationResponse> {
    const email = normalizeEmail(emailInput);
    if (isManagedLearnerEmail(email)) return { ok: true };
    try {
      await this.identity.resendSignup(email, `${this.webOrigin}/es-PE/login?verified=1`);
    } catch (error) {
      const category = error instanceof AppError ? `${error.code}/${error.status}` : 'UNEXPECTED';
      this.logger.warn(`El proveedor no pudo reenviar una confirmación (${category})`);
    }
    return { ok: true };
  }

  async createManagedLearner(
    guardianId: string,
    request: CreateManagedLearnerRequest,
  ): Promise<CreateManagedLearnerResponse> {
    if (request.consentNoticeVersion !== ACTIVE_CONSENT_NOTICE_VERSION) {
      throw new AppError(
        'VALIDATION_FAILED',
        409,
        'El aviso de privacidad cambió. Revísalo antes de continuar.',
      );
    }
    if (request.consents.ai_voice !== request.consents.international_transfer) {
      throw new AppError(
        'VALIDATION_FAILED',
        400,
        'La voz con IA requiere aceptar también su transferencia internacional.',
      );
    }

    const ageBand = ageBandForBirthYear(request.birthYear, new Date().getFullYear());
    if (ageBand === null) {
      throw new AppError(
        'AGE_NOT_ALLOWED',
        403,
        'StarbizAcademy está diseñada para estudiantes desde los 12 años cumplidos.',
      );
    }
    if (ageBand === 'a18_plus') {
      throw new AppError(
        'VALIDATION_FAILED',
        400,
        'Las cuentas administradas por un apoderado son solo para menores de edad.',
      );
    }

    const loginName = normalizeLoginName(request.loginName);
    const technicalEmail = managedLearnerEmail(loginName);
    await this.ensureManagedIdentityFree(loginName);
    const grantedConsents: ConsentPurpose[] = ['service', 'storage'];
    if (request.consents.ai_voice && request.consents.international_transfer) {
      grantedConsents.push('ai_voice', 'international_transfer');
    }

    const { authId } = await this.identity.signUp(technicalEmail, request.password);
    try {
      const learner = await this.prisma.$transaction(async (tx) => {
        const guardian = await tx.user.findUnique({
          where: { id: guardianId },
          select: { role: true },
        });
        if (!guardian || guardian.role !== 'guardian') {
          throw new AppError('FORBIDDEN', 403, 'Solo un apoderado puede crear esta cuenta.');
        }
        const created = await tx.user.create({
          data: {
            displayName: request.displayName,
            email: null,
            loginName,
            authId,
            role: 'learner',
            ageBand,
            birthYear: request.birthYear,
            mustChangePassword: true,
          },
        });
        await tx.guardianLearnerLink.create({
          data: { guardianId, learnerId: created.id, status: 'active' },
        });
        await tx.consentGrant.createMany({
          data: grantedConsents.map((purpose) => ({
            learnerId: created.id,
            grantedById: guardianId,
            purpose,
            noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION,
          })),
        });
        await this.outboxService.emitInTx(tx, {
          aggregateType: 'learner',
          aggregateId: created.id,
          eventType: 'guardian.managed_learner_created',
          payload: {
            purposes: grantedConsents,
            noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION,
          },
        });
        await this.auditService.recordInTx(tx, {
          actorId: guardianId,
          action: 'guardian.managed_learner_created',
          objectType: 'learner',
          objectId: created.id,
          metadata: {
            purposes: grantedConsents,
            noticeVersion: ACTIVE_CONSENT_NOTICE_VERSION,
            legalGuardianAttestation: true,
          },
        });
        return created;
      });

      return {
        learner: {
          id: learner.id,
          displayName: learner.displayName,
          loginName,
          ageBand,
        },
        linkStatus: 'active',
        grantedConsents,
        consentNoticeVersion: ACTIVE_CONSENT_NOTICE_VERSION,
        assentRequired: true,
        nextAction: 'learner_first_login',
      };
    } catch (error) {
      await this.rollbackIdentity(authId);
      if (isUniqueConstraintViolation(error)) {
        throw new AppError(
          'VALIDATION_FAILED',
          409,
          'Ese nombre de acceso no está disponible. Elige otro.',
        );
      }
      throw error;
    }
  }

  /**
   * Cambia la clave temporal. Las dos barreras locales cierran logins que
   * compitan con la llamada administrativa al proveedor de identidad.
   */
  async changeInitialPassword(
    learnerId: string,
    request: ChangeInitialPasswordRequest,
  ): Promise<User> {
    const prepared = await this.prisma.$transaction(async (tx) => {
      await lockLearnerPolicy(tx, learnerId);
      const learner = await tx.user.findUnique({ where: { id: learnerId } });
      if (
        !learner ||
        learner.role !== 'learner' ||
        !learner.authId ||
        !learner.loginName ||
        !learner.mustChangePassword
      ) {
        throw new AppError('FORBIDDEN', 403, 'Esta cuenta no tiene una clave temporal pendiente.');
      }
      const guarded = await tx.user.updateMany({
        where: {
          id: learner.id,
          mustChangePassword: true,
          credentialVersion: learner.credentialVersion,
        },
        data: { credentialVersion: { increment: 1 } },
      });
      if (guarded.count !== 1) {
        throw new AppError('SERVICE_UNAVAILABLE', 503, 'La cuenta cambió. Intenta nuevamente.');
      }
      await tx.authSession.updateMany({
        where: { userId: learner.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { authId: learner.authId, credentialVersion: learner.credentialVersion + 1 };
    });

    await this.identity.updateUserPassword(prepared.authId, request.password);

    return this.prisma.$transaction(async (tx) => {
      await lockLearnerPolicy(tx, learnerId);
      const guarded = await tx.user.updateMany({
        where: {
          id: learnerId,
          mustChangePassword: true,
          credentialVersion: prepared.credentialVersion,
        },
        data: {
          mustChangePassword: false,
          credentialVersion: { increment: 1 },
        },
      });
      if (guarded.count !== 1) {
        throw new AppError(
          'SERVICE_UNAVAILABLE',
          503,
          'La contraseña cambió, pero debes iniciar sesión y confirmar el cambio nuevamente.',
        );
      }
      await tx.authSession.updateMany({
        where: { userId: learnerId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'learner',
        aggregateId: learnerId,
        eventType: 'learner.initial_password_changed',
        payload: {},
      });
      await this.auditService.recordInTx(tx, {
        actorId: learnerId,
        action: 'learner.initial_password_changed',
        objectType: 'learner',
        objectId: learnerId,
      });
      const updated = await tx.user.findUnique({ where: { id: learnerId } });
      if (!updated) throw new AppError('NOT_FOUND', 404, 'Cuenta no encontrada.');
      return updated;
    });
  }

  async resetManagedLearnerPassword(
    guardianId: string,
    learnerId: string,
    request: ResetManagedLearnerPasswordRequest,
  ): Promise<ResetManagedLearnerPasswordResponse> {
    const learner = await this.prisma.$transaction(async (tx) => {
      await lockLearnerPolicy(tx, learnerId);
      const link = await tx.guardianLearnerLink.findFirst({
        where: { guardianId, learnerId, status: 'active' },
        select: { id: true },
      });
      if (!link)
        throw new AppError('FORBIDDEN', 403, 'No existe un vínculo activo con este alumno.');
      const current = await tx.user.findUnique({ where: { id: learnerId } });
      if (!current || current.role !== 'learner' || !current.authId || !current.loginName) {
        throw new AppError('VALIDATION_FAILED', 400, 'Esta no es una cuenta administrada.');
      }
      const guarded = await tx.user.updateMany({
        where: { id: learnerId, credentialVersion: current.credentialVersion },
        data: { mustChangePassword: true, credentialVersion: { increment: 1 } },
      });
      if (guarded.count !== 1) {
        throw new AppError('SERVICE_UNAVAILABLE', 503, 'La cuenta cambió. Intenta nuevamente.');
      }
      await tx.authSession.updateMany({
        where: { userId: learnerId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.auditService.recordInTx(tx, {
        actorId: guardianId,
        action: 'guardian.managed_learner_password_reset_requested',
        objectType: 'learner',
        objectId: learnerId,
      });
      return { authId: current.authId, loginName: current.loginName };
    });

    await this.identity.updateUserPassword(learner.authId, request.password);

    await this.prisma.$transaction(async (tx) => {
      await lockLearnerPolicy(tx, learnerId);
      await tx.user.update({
        where: { id: learnerId },
        data: { mustChangePassword: true, credentialVersion: { increment: 1 } },
      });
      await tx.authSession.updateMany({
        where: { userId: learnerId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'learner',
        aggregateId: learnerId,
        eventType: 'guardian.managed_learner_password_reset',
        payload: {},
      });
      await this.auditService.recordInTx(tx, {
        actorId: guardianId,
        action: 'guardian.managed_learner_password_reset',
        objectType: 'learner',
        objectId: learnerId,
      });
    });

    return {
      ok: true,
      learnerId,
      loginName: learner.loginName,
      mustChangePassword: true,
    };
  }

  async nextActionFor(
    user: Pick<User, 'id' | 'role' | 'ageBand' | 'mustChangePassword'> | SessionUser,
  ): Promise<MeResponse['nextAction']> {
    if (user.role === 'guardian') return 'guardian_family';
    if (user.role === 'staff') return 'staff_home';
    if (user.mustChangePassword) return 'change_password';
    if (user.ageBand === 'a18_plus') return 'learner_home';
    const assent = await this.prisma.youthAssent.findFirst({
      where: {
        learnerId: user.id,
        noticeVersion: ACTIVE_ASSENT_NOTICE_VERSION,
        revokedAt: null,
      },
      select: { id: true },
    });
    return assent ? 'learner_home' : 'youth_assent';
  }

  /** El registro jamás abre sesión sobre una cuenta existente: eso es del login. */
  private async ensureEmailFree(email: string): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('VALIDATION_FAILED', 409, REGISTRATION_CONFLICT_MESSAGE);
    }
  }

  private async tryRecoverGuardianAuthId(
    email: string,
    password: string,
  ): Promise<string | null> {
    try {
      return (await this.identity.signIn(email, password)).authId;
    } catch (error) {
      const category = error instanceof AppError ? `${error.code}/${error.status}` : 'UNEXPECTED';
      this.logger.warn(`No se pudo recuperar una identidad preexistente (${category})`);
      return null;
    }
  }

  private async reconcileGuardianIdentity(email: string, authId: string): Promise<boolean> {
    const byEmail = await this.prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (byEmail.role !== 'guardian') return false;
      if (byEmail.authId === authId) return true;
      if (byEmail.authId !== null) return false;
      const linked = await this.prisma.user.updateMany({
        where: { id: byEmail.id, email, authId: null, role: 'guardian' },
        data: { authId },
      });
      if (linked.count === 1) return true;
      const afterRace = await this.prisma.user.findUnique({ where: { id: byEmail.id } });
      return afterRace?.role === 'guardian' && afterRace.authId === authId;
    }

    const byAuthId = await this.prisma.user.findUnique({ where: { authId } });
    return byAuthId?.role === 'guardian' && normalizeEmail(byAuthId.email ?? '') === email;
  }

  private async ensureManagedIdentityFree(loginName: string): Promise<void> {
    const loginUser = await this.prisma.user.findUnique({ where: { loginName } });
    if (loginUser) {
      throw new AppError(
        'VALIDATION_FAILED',
        409,
        'Ese nombre de acceso no está disponible. Elige otro.',
      );
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

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toLowerCase();
}

function normalizeLoginName(loginName: string): string {
  return loginName.trim().toLowerCase();
}

export function managedLearnerEmail(loginName: string): string {
  return `${normalizeLoginName(loginName)}@${MANAGED_LEARNER_EMAIL_DOMAIN}`;
}

function isManagedLearnerEmail(email: string): boolean {
  return email.endsWith(`@${MANAGED_LEARNER_EMAIL_DOMAIN}`);
}

function assertContactEmail(email: string): void {
  if (isManagedLearnerEmail(email)) {
    throw new AppError('VALIDATION_FAILED', 400, 'Usa un correo real que puedas confirmar.');
  }
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
