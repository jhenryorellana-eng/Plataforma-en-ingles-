import { Global, Module } from '@nestjs/common';
import { AccessService } from '../common/access.service';
import { SessionService } from '../common/session.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, AccessService, SessionService],
  exports: [PrismaService, AccessService, SessionService],
})
export class PrismaModule {}
