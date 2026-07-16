import { Injectable } from '@nestjs/common';
import type { Prisma, Skill } from '@prisma/client';
import { uuidv7 } from '@star/contracts';
import { AppError, notFound } from '../../common/errors';
import type { SessionUser } from '../../common/session';
import { loadConfig } from '../../config/config';
import { AuditService } from '../audit/audit.service';
import { OutboxService } from '../audit/outbox.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAiAuthoringProvider, TemplateAuthoringProvider } from './authoring-providers';
import type { AuthoringProvider, GeneratedActivity } from './generated-lesson';

/**
 * Curriculum Studio (Especificación §8.1): el docente sugiere el TEMA,
 * la IA redacta el borrador completo con la estructura de la Metodología,
 * y nada llega al alumno sin publicación humana (§4.2: quien crea no publica).
 */
@Injectable()
export class StudioService {
  private readonly provider: AuthoringProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
  ) {
    const config = loadConfig();
    this.provider =
      config.openaiApiKey && config.openaiTextModel
        ? new OpenAiAuthoringProvider(config.openaiApiKey, config.openaiTextModel)
        : new TemplateAuthoringProvider();
  }

  async overview(): Promise<unknown> {
    const version = await this.currentVersion();
    const [units, competencies, lessons] = await Promise.all([
      this.prisma.unit.findMany({
        where: { programVersionId: version.id },
        orderBy: { orderIndex: 'asc' },
        include: {
          lessonContracts: {
            orderBy: { orderIndex: 'asc' },
            include: { _count: { select: { activities: true } } },
          },
        },
      }),
      this.prisma.competency.findMany({ where: { programVersionId: version.id } }),
      this.prisma.lessonContract.findMany({
        where: { programVersionId: version.id },
        include: { lessonCompetencies: true },
      }),
    ]);

    const coveredCompetencyIds = new Set(
      lessons
        .filter((lesson) => lesson.status === 'published')
        .flatMap((lesson) => lesson.lessonCompetencies.map((lc) => lc.competencyId)),
    );

    return {
      program: { code: 'english-path', version: version.version },
      authoringProvider: this.provider.name,
      stats: {
        publishedLessons: lessons.filter((l) => l.status === 'published').length,
        draftLessons: lessons.filter((l) => l.status === 'draft').length,
        competenciesTotal: competencies.length,
        competenciesCovered: coveredCompetencyIds.size,
      },
      units: units.map((unit) => ({
        code: unit.code,
        name: unit.name,
        lessons: unit.lessonContracts.map((lesson) => ({
          id: lesson.id,
          code: lesson.code,
          objective: lesson.objective,
          status: lesson.status,
          sourceTopic: lesson.sourceTopic,
          createdBy: lesson.createdBy,
          activityCount: lesson._count.activities,
        })),
      })),
    };
  }

  async createDraft(
    actor: SessionUser,
    input: { topic: string; unitCode?: string; notes?: string },
  ): Promise<unknown> {
    const version = await this.currentVersion();
    const competencies = await this.prisma.competency.findMany({
      where: { programVersionId: version.id },
    });
    if (competencies.length === 0) {
      throw new AppError('INTERNAL', 500, 'El programa no tiene mapa de competencias');
    }

    const generated = await this.provider.generateLesson({
      topic: input.topic,
      notes: input.notes,
      cefrLevel: 'B1',
      availableSkills: [...new Set(competencies.map((c) => c.skill))],
    });

    // El tema es contexto: cada actividad se ancla a una competencia EXISTENTE del mapa.
    const competencyBySkill = new Map<Skill, string>();
    for (const competency of competencies) {
      if (!competencyBySkill.has(competency.skill) || competency.criticality === 'critical') {
        if (!competencyBySkill.has(competency.skill)) {
          competencyBySkill.set(competency.skill, competency.id);
        }
      }
    }

    const rubric = await this.prisma.rubricVersion.findFirst({
      where: { programVersionId: version.id },
    });

    const lessonId = await this.prisma.$transaction(async (tx) => {
      let unit = input.unitCode
        ? await tx.unit.findFirst({
            where: { programVersionId: version.id, code: input.unitCode },
          })
        : null;
      if (!unit) {
        const unitCount = await tx.unit.count({ where: { programVersionId: version.id } });
        const stage = await tx.stage.findFirstOrThrow({ where: { programVersionId: version.id } });
        unit = await tx.unit.create({
          data: {
            programVersionId: version.id,
            stageId: stage.id,
            code: `EN-B1-U${String(unitCount + 1).padStart(2, '0')}`,
            name: titleCase(input.topic),
            theme: generated.unitTheme,
            orderIndex: unitCount + 1,
          },
        });
      }

      const lessonCount = await tx.lessonContract.count({ where: { unitId: unit.id } });
      const lesson = await tx.lessonContract.create({
        data: {
          programVersionId: version.id,
          unitId: unit.id,
          code: `${unit.code}-L${String(lessonCount + 1).padStart(2, '0')}-${uuidv7().slice(0, 4)}`,
          objective: generated.objective,
          immersionRatio: generated.immersionRatio,
          timeboxSeconds: generated.timeboxSeconds,
          orderIndex: lessonCount + 1,
          status: 'draft',
          createdBy: `ai:${this.provider.name}`,
          sourceTopic: input.topic,
          evidenceRequirements: { minimumActivities: 2 } as Prisma.InputJsonObject,
        },
      });

      const linkedCompetencies = new Set<string>();
      for (const [index, activity] of generated.activities.entries()) {
        const competencyId = competencyBySkill.get(activity.skill as Skill);
        if (!competencyId) continue;
        linkedCompetencies.add(competencyId);
        await tx.activity.create({
          data: {
            programVersionId: version.id,
            lessonContractId: lesson.id,
            competencyId,
            rubricVersionId: activity.kind === 'writing_prompt' ? (rubric?.id ?? null) : null,
            code: `${lesson.code}-A${String(index + 1).padStart(2, '0')}`,
            kind: activity.kind,
            skill: activity.skill as Skill,
            orderIndex: index + 1,
            isTransferVariant: activity.isTransferVariant,
            supportLevel: activity.supportLevel,
            prompt: this.buildPrompt(activity) as Prisma.InputJsonObject,
            answerKey: this.buildAnswerKey(activity) as Prisma.InputJsonObject,
          },
        });
      }
      for (const competencyId of linkedCompetencies) {
        await tx.lessonCompetency.create({
          data: { lessonContractId: lesson.id, competencyId },
        });
      }

      await this.outboxService.emitInTx(tx, {
        aggregateType: 'lesson_contract',
        aggregateId: lesson.id,
        eventType: 'content.draft_created',
        payload: { topic: input.topic, provider: this.provider.name },
      });
      await this.auditService.recordInTx(tx, {
        actorId: actor.id,
        action: 'content.draft_created',
        objectType: 'lesson_contract',
        objectId: lesson.id,
        metadata: { topic: input.topic, provider: this.provider.name },
      });
      return lesson.id;
    });

    return this.lessonDetail(lessonId);
  }

  async lessonDetail(lessonId: string): Promise<unknown> {
    const lesson = await this.prisma.lessonContract.findUnique({
      where: { id: lessonId },
      include: {
        unit: true,
        activities: { orderBy: { orderIndex: 'asc' } },
        lessonCompetencies: { include: { competency: true } },
      },
    });
    if (!lesson) throw notFound('Lección no encontrada');
    return {
      id: lesson.id,
      code: lesson.code,
      unit: { code: lesson.unit.code, name: lesson.unit.name },
      objective: lesson.objective,
      status: lesson.status,
      sourceTopic: lesson.sourceTopic,
      createdBy: lesson.createdBy,
      immersionRatio: lesson.immersionRatio,
      timeboxSeconds: lesson.timeboxSeconds,
      competencies: lesson.lessonCompetencies.map((lc) => ({
        code: lc.competency.code,
        descriptor: lc.competency.descriptor,
        skill: lc.competency.skill,
      })),
      // Vista de autoría: el docente SÍ ve claves y guiones para revisar calidad.
      activities: lesson.activities.map((activity) => ({
        id: activity.id,
        code: activity.code,
        kind: activity.kind,
        skill: activity.skill,
        isTransferVariant: activity.isTransferVariant,
        prompt: activity.prompt,
        answerKey: activity.answerKey,
      })),
    };
  }

  async decide(actor: SessionUser, lessonId: string, action: 'publish' | 'retire'): Promise<unknown> {
    const lesson = await this.prisma.lessonContract.findUnique({ where: { id: lessonId } });
    if (!lesson) throw notFound('Lección no encontrada');
    if (action === 'publish' && lesson.status !== 'draft') {
      throw new AppError('VALIDATION_FAILED', 409, 'Solo un borrador puede publicarse');
    }

    const status = action === 'publish' ? 'published' : 'retired';
    await this.prisma.$transaction(async (tx) => {
      await tx.lessonContract.update({ where: { id: lessonId }, data: { status } });
      await this.outboxService.emitInTx(tx, {
        aggregateType: 'lesson_contract',
        aggregateId: lessonId,
        eventType: action === 'publish' ? 'content.published' : 'content.retired',
        payload: {},
      });
      await this.auditService.recordInTx(tx, {
        actorId: actor.id,
        action: `content.${status}`,
        objectType: 'lesson_contract',
        objectId: lessonId,
        purpose: action === 'publish' ? 'Revisión docente aprobada' : 'Descartado por el docente',
      });
    });
    return this.lessonDetail(lessonId);
  }

  private async currentVersion() {
    const version = await this.prisma.programVersion.findFirst({
      where: { status: 'published', program: { code: 'english-path' } },
      orderBy: { publishedAt: 'desc' },
    });
    if (!version) throw notFound('No hay versión publicada de English Path');
    return version;
  }

  private buildPrompt(activity: GeneratedActivity): Record<string, unknown> {
    if (activity.kind === 'mcq') {
      return {
        instructions: activity.instructions,
        ...(activity.transcript ? { transcript: activity.transcript } : {}),
        stem: activity.stem,
        options: activity.options ?? [],
      };
    }
    if (activity.kind === 'gap_fill') {
      return {
        instructions: activity.instructions,
        text: activity.text ?? '',
        gaps: activity.accepted?.length ?? 1,
        ...(activity.hints ? { hints: activity.hints } : {}),
      };
    }
    if (activity.kind === 'writing_prompt') {
      return {
        instructions: activity.instructions,
        ...(activity.scenario ? { scenario: activity.scenario } : {}),
        minWords: activity.minWords ?? 60,
      };
    }
    return {
      objective: activity.objective ?? activity.instructions,
      scenario: activity.scenario ?? '',
      openingLine: activity.openingLine ?? 'Hello! Ready to start?',
      vocabulary: activity.vocabulary ?? [],
      mockScript: activity.mockScript ?? [],
    };
  }

  private buildAnswerKey(activity: GeneratedActivity): Record<string, unknown> {
    if (activity.kind === 'mcq') {
      return { correctIndex: activity.correctIndex ?? 0, explanation: activity.explanation ?? '' };
    }
    if (activity.kind === 'gap_fill') {
      return { accepted: activity.accepted ?? [] };
    }
    if (activity.kind === 'writing_prompt') {
      return {
        rubricSpec: {
          minWords: activity.minWords ?? 60,
          requiredElements: activity.requiredElements ?? [],
        },
      };
    }
    return { scoring: 'speaking evidence llega por el pipeline de evaluación' };
  }
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
