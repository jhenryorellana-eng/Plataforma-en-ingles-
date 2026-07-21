import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { AppError } from '../../common/errors';
import { OutboxDispatcher, type OutboxReadiness } from '../audit/outbox.dispatcher';
import { PrismaService } from '../../prisma/prisma.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxDispatcher: OutboxDispatcher,
  ) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{
    status: 'ready';
    dependencies: { database: 'up'; outbox: OutboxReadiness };
  }> {
    let outbox: OutboxReadiness;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      outbox = await this.outboxDispatcher.getReadiness();
    } catch {
      throw new AppError('SERVICE_UNAVAILABLE', 503, 'La base de datos o el outbox no están disponibles');
    }
    if (!this.outboxDispatcher.isReady(outbox)) {
      throw new AppError('SERVICE_UNAVAILABLE', 503, 'El publicador de outbox no está listo', { outbox });
    }
    return {
      status: 'ready',
      dependencies: {
        database: 'up',
        outbox,
      },
    };
  }
}
