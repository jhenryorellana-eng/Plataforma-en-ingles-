import { Module } from '@nestjs/common';
import { LocalRateLimitService } from '../../common/local-rate-limit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { StaffController } from './staff.controller';

@Module({
  controllers: [AuthController, StaffController],
  providers: [AuthService, LocalRateLimitService],
})
export class AuthModule {}
