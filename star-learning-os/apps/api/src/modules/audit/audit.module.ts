import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxService } from './outbox.service';

@Global()
@Module({
  providers: [AuditService, OutboxService, OutboxDispatcher],
  exports: [AuditService, OutboxService],
})
export class AuditModule {}
