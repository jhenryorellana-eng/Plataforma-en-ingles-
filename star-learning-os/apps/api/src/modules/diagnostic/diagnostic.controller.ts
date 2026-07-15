import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  zDiagnosticAnswerRequest,
  zDiagnosticWritingRequest,
  type DiagnosticAttemptResponse,
  type DiagnosticNextResponse,
} from '@star/contracts';
import { AccessService } from '../../common/access.service';
import { CurrentUser } from '../../common/decorators';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { DiagnosticService } from './diagnostic.service';

@Controller()
export class DiagnosticController {
  constructor(
    private readonly diagnosticService: DiagnosticService,
    private readonly accessService: AccessService,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  @Post('enrollments/:id/diagnostic-attempts')
  async start(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<DiagnosticAttemptResponse> {
    const enrollment = await this.accessService.assertEnrollmentAccess(user, id);
    return this.diagnosticService.startOrResume(enrollment);
  }

  @Post('diagnostic-attempts/:id/responses')
  async answer(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const request = parse(zDiagnosticAnswerRequest, body);
    return this.diagnosticService.answer(user, id, request.itemCode, request.selectedIndex);
  }

  @Get('diagnostic-attempts/:id/next-items')
  async nextItems(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<DiagnosticNextResponse> {
    return this.diagnosticService.nextItems(user, id);
  }

  @Post('diagnostic-attempts/:id/writing')
  async writing(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const request = parse(zDiagnosticWritingRequest, body);
    return this.diagnosticService.submitWriting(user, id, request.itemCode, request.text);
  }

  @Post('diagnostic-attempts/:id/complete')
  async complete(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<unknown> {
    const { enrollmentId } = await this.diagnosticService.complete(user, id);
    return this.enrollmentService.toResponse(enrollmentId);
  }
}
