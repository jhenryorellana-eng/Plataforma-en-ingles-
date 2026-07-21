import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SessionGuard } from './common/session.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { DiagnosticModule } from './modules/diagnostic/diagnostic.module';
import { EconomyModule } from './modules/economy/economy.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { FamilyModule } from './modules/family/family.module';
import { HealthModule } from './modules/health/health.module';
import { LearningModule } from './modules/learning/learning.module';
import { PreviewModule } from './modules/preview/preview.module';
import { ReviewModule } from './modules/review/review.module';
import { StudioModule } from './modules/studio/studio.module';
import { SafetyModule } from './modules/safety/safety.module';
import { VoiceModule } from './modules/voice/voice.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    CatalogModule,
    FamilyModule,
    HealthModule,
    EnrollmentModule,
    DiagnosticModule,
    LearningModule,
    VoiceModule,
    EconomyModule,
    SafetyModule,
    ReviewModule,
    PreviewModule,
    StudioModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: SessionGuard }],
})
export class AppModule {}
