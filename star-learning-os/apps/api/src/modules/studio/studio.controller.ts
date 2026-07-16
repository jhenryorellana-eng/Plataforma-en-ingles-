import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Roles } from '../../common/decorators';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { StudioService } from './studio.service';

const zCreateDraftRequest = z.object({
  topic: z.string().min(3).max(120),
  unitCode: z.string().min(2).max(30).optional(),
  notes: z.string().max(500).optional(),
});

const zDecisionRequest = z.object({
  action: z.enum(['publish', 'retire']),
});

/** Dashboard del docente: sugiere el tema, la IA redacta, el docente publica. */
@Roles('staff')
@Controller('studio')
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  @Get('overview')
  async overview(): Promise<unknown> {
    return this.studioService.overview();
  }

  @Post('lesson-drafts')
  async createDraft(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<unknown> {
    const request = parse(zCreateDraftRequest, body);
    return this.studioService.createDraft(user, request);
  }

  @Get('lessons/:id')
  async lessonDetail(@Param('id') id: string): Promise<unknown> {
    return this.studioService.lessonDetail(id);
  }

  @Post('lessons/:id/decision')
  async decide(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const request = parse(zDecisionRequest, body);
    return this.studioService.decide(user, id, request.action);
  }
}
