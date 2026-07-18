import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { zAvatarConfig, zEquipRequest, zPurchaseRequest, type EconomyState } from '@star/contracts';
import { CurrentUser } from '../../common/decorators';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { EconomyService } from './economy.service';

const zUpdateAvatarRequest = z.object({ config: zAvatarConfig });

/** Economía STAR: Novas (solo se ganan aprendiendo), avatar y tienda de cosméticos. */
@Controller('economy')
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('state')
  async state(@CurrentUser() user: SessionUser): Promise<EconomyState> {
    return this.economyService.getState(user.id);
  }

  @Put('avatar')
  async saveAvatar(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<{ ok: true }> {
    const request = parse(zUpdateAvatarRequest, body);
    return this.economyService.saveAvatar(user.id, request.config);
  }

  @Post('purchase')
  async purchase(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<{ balance: number }> {
    const request = parse(zPurchaseRequest, body);
    return this.economyService.purchase(user.id, request.itemId);
  }

  @Post('equip')
  async equip(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<{ equipped: string[] }> {
    const request = parse(zEquipRequest, body);
    return this.economyService.equip(user.id, request.itemId, request.equipped);
  }
}
