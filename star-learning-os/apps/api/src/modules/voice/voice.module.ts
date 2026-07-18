import { Module } from '@nestjs/common';
import { EconomyModule } from '../economy/economy.module';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [EconomyModule],
  controllers: [VoiceController],
  providers: [VoiceService],
})
export class VoiceModule {}
