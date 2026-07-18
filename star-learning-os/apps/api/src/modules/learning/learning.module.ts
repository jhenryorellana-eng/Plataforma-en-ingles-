import { Module } from '@nestjs/common';
import { EconomyModule } from '../economy/economy.module';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';

@Module({
  imports: [EconomyModule],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}
