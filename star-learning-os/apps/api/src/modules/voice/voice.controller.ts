import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { zCreateVoiceSessionRequest, zEndVoiceSessionRequest, type VoiceSessionResponse } from '@star/contracts';
import { AccessService } from '../../common/access.service';
import { CurrentUser } from '../../common/decorators';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { VoiceService } from './voice.service';

const zHeartbeatRequest = z.object({
  activeSecondsDelta: z.number().int().min(0).max(600),
});

@Controller()
export class VoiceController {
  constructor(
    private readonly voiceService: VoiceService,
    private readonly accessService: AccessService,
  ) {}

  @Post('enrollments/:id/voice-sessions')
  async create(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<VoiceSessionResponse> {
    const request = parse(zCreateVoiceSessionRequest, body);
    const enrollment = await this.accessService.assertEnrollmentAccess(user, id);
    return this.voiceService.create(user, enrollment, request);
  }

  @Post('voice-sessions/:id/heartbeat')
  async heartbeat(
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<unknown> {
    const request = parse(zHeartbeatRequest, body);
    return this.voiceService.heartbeat(user, id, request.activeSecondsDelta);
  }

  @Post('voice-sessions/:id/end')
  async end(@CurrentUser() user: SessionUser, @Param('id') id: string, @Body() body: unknown): Promise<unknown> {
    const request = parse(zEndVoiceSessionRequest, body ?? {});
    return this.voiceService.end(user, id, request);
  }

  @Get('enrollments/:id/usage')
  async usage(@CurrentUser() user: SessionUser, @Param('id') id: string): Promise<unknown> {
    const enrollment = await this.accessService.assertEnrollmentAccess(user, id);
    return this.voiceService.usage(enrollment);
  }
}
