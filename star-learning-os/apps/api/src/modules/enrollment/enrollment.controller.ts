import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  zCreateEnrollmentRequest,
  zUpdatePaceRequest,
  type EnrollmentResponse,
  type PaceOptionsResponse,
  type PathResponse,
  type ProgressResponse,
} from '@star/contracts';
import { AccessService } from '../../common/access.service';
import { CurrentUser } from '../../common/decorators';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { EnrollmentService } from './enrollment.service';

@Controller('enrollments')
export class EnrollmentController {
  constructor(
    private readonly enrollmentService: EnrollmentService,
    private readonly accessService: AccessService,
  ) {}

  @Post()
  async create(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<EnrollmentResponse> {
    const request = parse(zCreateEnrollmentRequest, body);
    return this.enrollmentService.create(user, request);
  }

  @Get()
  async listMine(@CurrentUser() user: SessionUser): Promise<EnrollmentResponse[]> {
    return this.enrollmentService.listMine(user);
  }

  @Get(':id')
  async detail(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<EnrollmentResponse> {
    await this.accessService.assertEnrollmentAccess(user, id);
    return this.enrollmentService.toResponse(id);
  }

  @Get(':id/pace-options')
  async paceOptions(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<PaceOptionsResponse> {
    const enrollment = await this.accessService.assertEnrollmentAccess(user, id);
    return this.enrollmentService.paceOptions(enrollment);
  }

  @Patch(':id/pace')
  async updatePace(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<EnrollmentResponse> {
    const request = parse(zUpdatePaceRequest, body);
    const enrollment = await this.accessService.assertEnrollmentAccess(user, id);
    return this.enrollmentService.updatePace(user, enrollment, request.paceCode);
  }

  @Get(':id/progress')
  async progress(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<ProgressResponse> {
    const enrollment = await this.accessService.assertEnrollmentAccess(user, id);
    return this.enrollmentService.progress(enrollment);
  }

  @Get(':id/path')
  async path(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<PathResponse> {
    const enrollment = await this.accessService.assertEnrollmentAccess(user, id);
    return this.enrollmentService.path(enrollment);
  }
}
