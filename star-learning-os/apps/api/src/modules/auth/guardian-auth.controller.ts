import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  zCreateManagedLearnerRequest,
  zResetManagedLearnerPasswordRequest,
  type CreateManagedLearnerResponse,
  type ResetManagedLearnerPasswordResponse,
} from '@star/contracts';
import { z } from 'zod';
import { CurrentUser, Roles } from '../../common/decorators';
import { AUTH_RATE_LIMITS, LocalRateLimitService } from '../../common/local-rate-limit.service';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { AuthService } from './auth.service';

const zLearnerParams = z.object({ learnerId: z.string().uuid() });

@Controller('guardian')
export class GuardianAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rateLimit: LocalRateLimitService,
  ) {}

  @Roles('guardian')
  @Post('learners')
  async createLearner(
    @CurrentUser() guardian: SessionUser,
    @Body() body: unknown,
    @Req() httpRequest: FastifyRequest,
  ): Promise<CreateManagedLearnerResponse> {
    const request = parse(zCreateManagedLearnerRequest, body);
    this.rateLimit.assertAllowed(
      'guardian.learner.create',
      httpRequest.ip,
      request.loginName,
      AUTH_RATE_LIMITS.registration,
    );
    return this.authService.createManagedLearner(guardian.id, request);
  }

  @Roles('guardian')
  @Post('learners/:learnerId/reset-password')
  async resetLearnerPassword(
    @CurrentUser() guardian: SessionUser,
    @Param() paramsInput: unknown,
    @Body() body: unknown,
    @Req() httpRequest: FastifyRequest,
  ): Promise<ResetManagedLearnerPasswordResponse> {
    const { learnerId } = parse(zLearnerParams, paramsInput);
    const request = parse(zResetManagedLearnerPasswordRequest, body);
    this.rateLimit.assertAllowed(
      'guardian.learner.password-reset',
      httpRequest.ip,
      learnerId,
      AUTH_RATE_LIMITS.passwordReset,
    );
    return this.authService.resetManagedLearnerPassword(guardian.id, learnerId, request);
  }
}
