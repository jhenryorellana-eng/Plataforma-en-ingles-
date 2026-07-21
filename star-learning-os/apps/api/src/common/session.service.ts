import { createHash, randomBytes } from 'node:crypto';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { StaffCapability, User } from '@prisma/client';
import { AppError } from './errors';
import { PrismaService } from '../prisma/prisma.service';
import { SESSION_DURATION_SECONDS, type SessionUser } from './session';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

type UserWithGrants = User & { staffGrants: Array<{ capability: StaffCapability }> };

function toSessionUser(user: UserWithGrants): SessionUser {
  return {
    id: user.id,
    displayName: user.displayName,
    role: user.role,
    ageBand: user.ageBand,
    capabilities: user.staffGrants.map((grant) => grant.capability),
  };
}

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;
const REVOKED_RETENTION_MS = 24 * 60 * 60 * 1000;

/** Sesiones opacas y revocables; nunca se persiste el token que viaja en la cookie. */
@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    this.cleanupTimer = setInterval(
      () =>
        void this.cleanup().catch((error: unknown) => {
          this.logger.warn(`No se pudieron depurar sesiones expiradas: ${error instanceof Error ? error.message : String(error)}`);
        }),
      CLEANUP_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async create(user: User): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    await this.prisma.authSession.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    });
    return token;
  }

  /**
   * Abre una sesión solo si ninguna barrera de credenciales avanzó desde que
   * comenzó la validación externa. El incremento es a la vez CAS y lock de fila:
   * si reset gana primero, updateMany devuelve cero; si login gana, reset espera
   * el commit y revoca esta sesión dentro de su misma transacción.
   */
  async createAfterCredentialValidation(
    user: User,
    expectedCredentialVersion: number,
  ): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    return this.prisma.$transaction(async (tx) => {
      const guarded = await tx.user.updateMany({
        where: { id: user.id, credentialVersion: expectedCredentialVersion },
        data: { credentialVersion: { increment: 1 } },
      });
      if (guarded.count !== 1) {
        throw new AppError('INVALID_CREDENTIALS', 401, 'Correo o contraseña incorrectos');
      }
      await tx.authSession.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
      });
      return token;
    });
  }

  async resolve(token: string): Promise<SessionUser | null> {
    const now = new Date();
    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { include: { staffGrants: { select: { capability: true } } } } },
    });
    if (!session || session.revokedAt || session.expiresAt <= now) {
      if (session && !session.revokedAt) {
        await this.prisma.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: now },
        });
      }
      return null;
    }
    return toSessionUser(session.user);
  }

  async revoke(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.authSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async capabilitiesFor(userId: string): Promise<StaffCapability[]> {
    const grants = await this.prisma.staffGrant.findMany({
      where: { userId },
      select: { capability: true },
    });
    return grants.map((grant) => grant.capability);
  }

  private async cleanup(): Promise<void> {
    const now = new Date();
    await this.prisma.authSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { revokedAt: { lt: new Date(now.getTime() - REVOKED_RETENTION_MS) } },
        ],
      },
    });
  }
}
