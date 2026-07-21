import { Module } from '@nestjs/common';
import { LocalRateLimitService } from '../../common/local-rate-limit.service';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';

@Module({
  controllers: [FamilyController],
  providers: [FamilyService, LocalRateLimitService],
})
export class FamilyModule {}
