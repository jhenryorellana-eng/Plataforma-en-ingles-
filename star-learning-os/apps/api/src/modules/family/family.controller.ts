import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  zAcceptInvitationRequest,
  zCreateInvitationRequest,
  zGrantConsentsRequest,
  zRecordAssentRequest,
  zRevokeConsentRequest,
} from '@star/contracts';
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

  @Roles('learner')
  @Post('family-invitations')
  async invite(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<unknown> {
    const request = parse(zCreateInvitationRequest, body);
    return this.familyService.createInvitation(user.id, request.guardianEmail);
  }

  @Roles('guardian')
  @Post('family-invitations/accept')
  async accept(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<unknown> {
    const request = parse(zAcceptInvitationRequest, body);
    return this.familyService.acceptInvitation(user, request.code);
  }

  @Roles('learner')
  @Get('onboarding/status')
  async onboardingStatus(@CurrentUser() user: SessionUser): Promise<unknown> {
    return this.familyService.onboardingStatus(user);
  }

  @Roles('guardian')
  @Post('consents/revoke')
  async revokeConsent(@CurrentUser() user: SessionUser, @Body() body: unknown): Promise<unknown> {
    const request = parse(zRevokeConsentRequest, body);
    await this.accessService.assertGuardianOfLearner(user, request.learnerId);
    return this.familyService.revokeConsent(user.id, request.learnerId, request.purpose);
  }
}
