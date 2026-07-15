import { Global, Module } from '@nestjs/common';
import { AccessService } from '../common/access.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, AccessService],
  exports: [PrismaService, AccessService],
})
export class PrismaModule {}
