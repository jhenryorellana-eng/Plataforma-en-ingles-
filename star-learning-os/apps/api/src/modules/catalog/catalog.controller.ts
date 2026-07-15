import { Controller, Get, Param } from '@nestjs/common';
import { PLAN_LIMITS } from '@star/domain';
import { Public } from '../../common/decorators';
import { notFound } from '../../common/errors';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('programs')
export class CatalogController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list(): Promise<unknown> {
    const programs = await this.prisma.languageProgram.findMany({
      where: { status: 'active' },
      include: {
        versions: { where: { status: 'published' }, orderBy: { publishedAt: 'desc' }, take: 1 },
      },
    });
    return programs
      .filter((program) => program.versions.length > 0)
      .map((program) => ({
        code: program.code,
        name: program.name,
        targetLanguage: program.targetLanguage,
        defaultTargetVariety: program.defaultTargetVariety,
        minimumAge: program.minimumAge,
        latestVersion: program.versions[0].version,
        paces: PLAN_LIMITS,
      }));
  }

  @Public()
  @Get(':code')
  async detail(@Param('code') code: string): Promise<unknown> {
    const program = await this.prisma.languageProgram.findUnique({
      where: { code },
      include: {
        versions: {
          where: { status: 'published' },
          orderBy: { publishedAt: 'desc' },
          take: 1,
          include: {
            tracks: true,
            stages: { orderBy: { orderIndex: 'asc' } },
            _count: { select: { competencies: true, lessonContracts: true } },
          },
        },
      },
    });
    if (!program || program.versions.length === 0) throw notFound('Programa no disponible');
    const version = program.versions[0];
    return {
      code: program.code,
      name: program.name,
      targetLanguage: program.targetLanguage,
      minimumAge: program.minimumAge,
      version: version.version,
      tracks: version.tracks.map((track) => ({ code: track.code, name: track.name })),
      stages: version.stages.map((stage) => ({
        code: stage.code,
        name: stage.name,
        cefrFrom: stage.cefrFrom,
        cefrTo: stage.cefrTo,
      })),
      competencyCount: version._count.competencies,
      lessonCount: version._count.lessonContracts,
      paces: PLAN_LIMITS,
    };
  }
}
