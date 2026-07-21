import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import type { StaffCapability } from '@prisma/client';
import { zUpdateStaffCapabilitiesRequest } from '@star/contracts';
import { Capabilities, CurrentUser, Roles } from '../../common/decorators';
import { AppError, notFound } from '../../common/errors';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';

@Roles('staff')
@Capabilities('operations')
@Controller('admin/staff')
export class StaffController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  @Get()
  async list(): Promise<unknown> {
    const staff = await this.prisma.user.findMany({
      where: { role: 'staff' },
      orderBy: { displayName: 'asc' },
      include: { staffGrants: { select: { capability: true } } },
    });
    return staff.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      capabilities: user.staffGrants.map((grant) => grant.capability),
    }));
  }

  @Put(':id/capabilities')
  async update(
    @CurrentUser() actor: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<{ id: string; capabilities: StaffCapability[] }> {
    const request = parse(zUpdateStaffCapabilitiesRequest, body);
    const target = await this.prisma.user.findFirst({ where: { id, role: 'staff' } });
    if (!target) throw notFound('Miembro de staff no encontrado');
    if (actor.id === id && !request.capabilities.includes('operations')) {
      throw new AppError('VALIDATION_FAILED', 409, 'No puedes retirar tu propio permiso de operaciones');
    }
    const capabilities = [...new Set(request.capabilities)] as StaffCapability[];
    await this.prisma.$transaction(async (tx) => {
      await tx.staffGrant.deleteMany({ where: { userId: id } });
      await tx.staffGrant.createMany({
        data: capabilities.map((capability) => ({ userId: id, capability })),
      });
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'staff_user',
        aggregateId: id,
        eventType: 'staff.capabilities_updated',
        payload: { capabilities },
      });
      await this.auditService.recordInTx(tx, {
        actorId: actor.id,
        action: 'staff.capabilities_updated',
        objectType: 'user',
        objectId: id,
        metadata: { capabilities },
      });
    });
    return { id, capabilities };
  }
}
