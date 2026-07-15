import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { User } from '@prisma/client';
import {
  zDevLoginRequest,
  zRegisterGuardianRequest,
  zRegisterLearnerRequest,
  type MeResponse,
} from '@star/contracts';
import { CurrentUser, Public } from '../../common/decorators';
import { parse } from '../../common/validate';
import { SESSION_COOKIE, signSession, type SessionUser } from '../../common/session';
import { loadConfig } from '../../config/config';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('dev-login')
  async devLogin(@Body() body: unknown, @Res({ passthrough: true }) reply: FastifyReply): Promise<MeResponse> {
    const request = parse(zDevLoginRequest, body ?? {});
    const user = await this.authService.devLogin(request);
    return this.openSession(user, reply);
  }

  /** Registro del alumno con age gate (12+). En producción: Identity Platform. */
  @Public()
  @Post('register-learner')
  async registerLearner(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<MeResponse> {
    const request = parse(zRegisterLearnerRequest, body);
    const user = await this.authService.registerLearner(request);
    return this.openSession(user, reply);
  }

  @Public()
  @Post('register-guardian')
  async registerGuardian(
    @Body() body: unknown,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<MeResponse> {
    const request = parse(zRegisterGuardianRequest, body);
    const user = await this.authService.registerGuardian(request);
    return this.openSession(user, reply);
  }

  private async openSession(user: User, reply: FastifyReply): Promise<MeResponse> {
    const token = await signSession(
      { id: user.id, displayName: user.displayName, role: user.role, ageBand: user.ageBand },
      loadConfig().sessionSecret,
    );
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 8 * 60 * 60,
    });
    return {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      ageBand: user.ageBand,
    };
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): MeResponse {
    return {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      ageBand: user.ageBand,
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) reply: FastifyReply): { ok: true } {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  }
}
