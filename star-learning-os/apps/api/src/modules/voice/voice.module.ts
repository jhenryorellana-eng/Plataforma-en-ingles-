import { Module } from '@nestjs/common';
import { LocalRateLimitService } from '../../common/local-rate-limit.service';
import { EconomyModule } from '../economy/economy.module';
import { VoiceDemoController } from './voice-demo.controller';
import { VoiceDemoService } from './voice-demo.service';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [EconomyModule],
  controllers: [VoiceController, VoiceDemoController],
  providers: [VoiceService, VoiceDemoService, LocalRateLimitService],
})
export class VoiceModule {}
