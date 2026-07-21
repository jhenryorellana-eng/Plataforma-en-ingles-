import { Body, Controller, Get, Logger, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User } from '@prisma/client';
import {
  zDevLoginRequest,
  zForgotPasswordRequest,
  zLoginRequest,
  zRegisterGuardianRequest,
  zRegisterLearnerRequest,
  zResetPasswordRequest,
  type MeResponse,
  type RegisterGuardianResponse,
  type ResetPasswordResponse,
} from '@star/contracts';
import { CurrentUser, Public } from '../../common/decorators';
import { AUTH_RATE_LIMITS, LocalRateLimitService } from '../../common/local-rate-limit.service';
import { parse } from '../../common/validate';
import { SESSION_COOKIE, SESSION_DURATION_SECONDS, type SessionUser } from '../../common/session';
import { SessionService } from '../../common/session.service';
import { loadConfig } from '../../config/config';
import { AuthService } from './auth.service';

export function requiresSecureCookie(webOrigin: string, isProduction: boolean): boolean {
  try {
    return new URL(webOrigin).protocol === 'https:';
  } catch {
    return isProduction;
  }
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly rateLimit: LocalRateLimitService,
  ) {}

  @Public()
  @Post('dev-login')
  async devLogin(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply): Promise<MeResponse> {
    const request = parse(zDevLoginRequest, body ?? {});
    const user = await this.authService.devLogin(request);
    return this.openSession(user, reply);
  }

  /** Inicio de sesión con correo y contraseña (Supabase Auth en producción). */
  @Public()
  @Post('login')
  async login(
    @Body() body: unknown,
    @Req() httpRequest: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<MeResponse> {
    const request = parse(zLoginRequest, body);
    this.rateLimit.assertAllowed('auth.login', httpRequest.ip, request.email, AUTH_RATE_LIMITS.login);
    const login = await this.authService.login(request);
    return this.openSession(login.user, reply, login.credentialVersion);
  }

  /** Siempre responde 200 con el mismo cuerpo: no revela si el correo existe. */
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: unknown, @Req() httpRequest: FastifyRequest): Promise<{ ok: true }> {
    const request = parse(zForgotPasswordRequest, body);
    this.rateLimit.assertAllowed('auth.recovery', httpRequest.ip, request.email, AUTH_RATE_LIMITS.recovery);
    await this.authService.forgotPassword(request.email);
    return { ok: true };
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() body: unknown,
    @Req() httpRequest: FastifyRequest,
  ): Promise<ResetPasswordResponse> {
    const request = parse(zResetPasswordRequest, body);
    this.rateLimit.assertAllowed(
      'auth.password-reset',
      httpRequest.ip,
      request.accessToken,
      AUTH_RATE_LIMITS.passwordReset,
    );
    return this.authService.resetPassword(request);
  }

  /** Registro del alumno con age gate (12+). En producción: Identity Platform. */
  @Public()
  @Post('register-learner')
  async registerLearner(
    @Body() body: unknown,
    @Req() httpRequest: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<MeResponse> {
    const request = parse(zRegisterLearnerRequest, body);
    this.rateLimit.assertAllowed(
      'auth.registration.learner',
      httpRequest.ip,
      request.email,
      AUTH_RATE_LIMITS.registration,
    );
    const user = await this.authService.registerLearner(request);
    return this.openSession(user, reply);
  }

  @Public()
  @Post('register-guardian')
  async registerGuardian(
    @Body() body: unknown,
    @Req() httpRequest: FastifyRequest,
  ): Promise<RegisterGuardianResponse> {
    const request = parse(zRegisterGuardianRequest, body);
    this.rateLimit.assertAllowed(
      'auth.registration.guardian',
      httpRequest.ip,
      request.email,
      AUTH_RATE_LIMITS.registration,
    );
    return this.authService.registerGuardian(request);
  }

  private async openSession(
    user: User,
    reply: FastifyReply,
    expectedCredentialVersion?: number,
  ): Promise<MeResponse> {
    const config = loadConfig();
    const token =
      expectedCredentialVersion === undefined
        ? await this.sessionService.create(user)
        : await this.sessionService.createAfterCredentialValidation(
            user,
            expectedCredentialVersion,
          );
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      // En producción la cookie solo viaja por HTTPS.
      secure: requiresSecureCookie(config.webOrigin, config.isProduction),
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    });
    return {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      ageBand: user.ageBand,
      capabilities: await this.sessionService.capabilitiesFor(user.id),
    };
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): MeResponse {
    return {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      ageBand: user.ageBand,
      capabilities: user.capabilities,
    };
  }

  @Post('logout')
  @Public()
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ ok: true }> {
    try {
      await this.sessionService.revoke(request.cookies?.[SESSION_COOKIE]);
    } catch (error) {
      this.logger.warn(
        `No se pudo revocar la sesión durante logout: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      reply.clearCookie(SESSION_COOKIE, { path: '/' });
    }
    return { ok: true };
  }
}
