import { Body, Controller, Get, Post } from '@nestjs/common';
import { zGrantConsentsRequest, zRecordAssentRequest } from '@star/contracts';
import { AccessService } from '../../common/access.service';
import { CurrentUser, Roles } from '../../common/decorators';
import type { SessionUser } from '../../common/session';
import { parse } from '../../common/validate';
import { FamilyService } from './family.service';

@Controller()
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    private readonly accessService: AccessService,
  ) {}

  @Roles('guardian')
  @Post('consents')
  async grantConsents(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<unknown> {
    const request = parse(zGrantConsentsRequest, body);
    await this.accessService.assertGuardianOfLearner(user, request.learnerId);
    return this.familyService.grantConsents(user.id, request);
  }

  @Roles('learner')
  @Post('assents')
  async recordAssent(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<unknown> {
    const request = parse(zRecordAssentRequest, body ?? {});
    return this.familyService.recordAssent(user.id, request.noticeVersion);
  }

  @Roles('guardian')
  @Get('guardian/learners')
  async myLearners(@CurrentUser() user: SessionUser): Promise<unknown> {
    return this.familyService.guardianSummary(user.id);
  }
}
