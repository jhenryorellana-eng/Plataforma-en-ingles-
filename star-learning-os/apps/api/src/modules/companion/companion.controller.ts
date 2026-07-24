import { Controller, Get } from '@nestjs/common';
import { Capabilities, CurrentUser, Roles } from '../../common/decorators';
import type { SessionUser } from '../../common/session';
import { CompanionService } from './companion.service';

/**
 * Panel sencillo para la persona que acompaña el aprendizaje.
 * Solo resume información académica existente; no permite actuar en nombre del alumno.
 */
@Roles('staff')
@Capabilities('academic_reviewer')
@Controller('companion')
export class CompanionController {
  constructor(private readonly companionService: CompanionService) {}

  @Get('overview')
  async overview(@CurrentUser() user: SessionUser): Promise<unknown> {
    return this.companionService.overview(user);
  }
}
