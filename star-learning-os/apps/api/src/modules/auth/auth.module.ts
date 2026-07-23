import { Module } from '@nestjs/common';
import { LocalRateLimitService } from '../../common/local-rate-limit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GuardianAuthController } from './guardian-auth.controller';
import { StaffController } from './staff.controller';

@Module({
  controllers: [AuthController, GuardianAuthController, StaffController],
  providers: [AuthService, LocalRateLimitService],
})
export class AuthModule {}
