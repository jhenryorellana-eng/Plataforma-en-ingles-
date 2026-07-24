import { Body, Controller, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Public } from '../../common/decorators';
import { LocalRateLimitService, PUBLIC_RATE_LIMITS } from '../../common/local-rate-limit.service';
import { parse } from '../../common/validate';
import { VoiceDemoService, type VoiceDemoCallResponse } from './voice-demo.service';

const zVoiceDemoCallRequest = z.object({
  sdp: z.string().min(100).max(50_000),
});

@Public()
@Controller('voice-demo')
export class VoiceDemoController {
  constructor(
    private readonly voiceDemoService: VoiceDemoService,
    private readonly rateLimit: LocalRateLimitService,
  ) {}

  @Post('call')
  async create(
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ): Promise<VoiceDemoCallResponse> {
    const input = parse(zVoiceDemoCallRequest, body);
    this.rateLimit.assertAllowed(
      'voice-demo.call',
      request.ip,
      request.ip,
      PUBLIC_RATE_LIMITS.voiceDemo,
    );
    return this.voiceDemoService.createCall(request.ip, input.sdp);
  }
}
