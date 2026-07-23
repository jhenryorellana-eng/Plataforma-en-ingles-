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

  /** No toca dependencias: sirve para detectar desfases entre Web y API. */
  @Get('version')
  version(): {
    service: 'star-api';
    buildSha: string;
    contractVersion: 'guardian-first-v1';
    capabilities: string[];
  } {
    return {
      service: 'star-api',
      buildSha: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? 'development',
      contractVersion: 'guardian-first-v1',
      capabilities: [
        'guardian-signup-email',
        'guardian-signup-resend',
        'guardian-creates-learner',
        'learner-temporary-password',
      ],
    };
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
      throw new AppError(
        'SERVICE_UNAVAILABLE',
        503,
        'La base de datos o el outbox no están disponibles',
      );
    }
    // Un dead letter histórico exige alerta, pero no debe impedir desplegar
    // la versión que puede repararlo. El modo preserve sí permanece no-ready.
    if (outbox === 'pending-preserved') {
      throw new AppError('SERVICE_UNAVAILABLE', 503, 'El publicador de outbox no está listo', {
        outbox,
      });
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
