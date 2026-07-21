import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  zStartSessionRequest,
  zSubmissionRequest,
  type SessionResponse,
  type SubmissionResult,
  type TodayResponse,
} from '@star/contracts';
import { AccessService } from '../../common/access.service';
import { CurrentUser } from '../../common/decorators';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { LearningService } from './learning.service';

@Controller()
export class LearningController {
  constructor(
    private readonly learningService: LearningService,
    private readonly accessService: AccessService,
  ) {}

  @Get('enrollments/:id/today')
  async today(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<TodayResponse> {
    const enrollment = await this.accessService.assertEnrollmentAccess(user, id);
    return this.learningService.today(enrollment);
  }

  @Get('enrollments/:id/review-queue')
  async reviewQueue(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<unknown> {
    const enrollment = await this.accessService.assertEnrollmentAccess(user, id);
    return this.learningService.reviewQueue(enrollment);
  }

  @Post('enrollments/:id/sessions')
  async startSession(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<SessionResponse> {
    const request = parse(zStartSessionRequest, body);
    const enrollment = await this.accessService.assertEnrollmentAccess(user, id);
    await this.accessService.assertLearnerSelf(user, enrollment);
    return this.learningService.startSession(enrollment, request.lessonContractId);
  }

  @Get('sessions/:id')
  async getSession(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<SessionResponse> {
    await this.learningService.getSessionForActor(user, id);
    return this.learningService.sessionResponse(id);
  }

  @Post('sessions/:id/complete')
  async completeSession(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<unknown> {
    return this.learningService.completeSession(user, id);
  }

  @Post('sessions/:id/activities/:activityId/submissions')
  async submit(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Param('activityId') activityId: string,
    @Body() body: unknown,
  ): Promise<SubmissionResult> {
    const request = parse(zSubmissionRequest, body);
    return this.learningService.submit(user, id, activityId, request);
  }
}
