import { Body, Controller, Get, Post } from '@nestjs/common';
import { zPreviewEstimateRequest, type PreviewEstimateResponse } from '@star/contracts';
import { estimatePlacement, type PlacementResponse, type Skill } from '@star/domain';
import { Public } from '../../common/decorators';
import { parse } from '../../common/validate';
import { PrismaService } from '../../prisma/prisma.service';

/** Ítems fijos del Preview: mezcla corta de habilidades, sin banco seguro. */
const PREVIEW_ITEM_CODES = ['DIAG-RD-01', 'DIAG-LIS-01', 'DIAG-LU-01', 'DIAG-RD-02', 'DIAG-LU-02'];

const SKILL_LABELS: Record<Skill, string> = {
  reading: 'lectura',
  listening: 'escucha',
  speaking: 'expresión oral',
  writing: 'escritura',
  language_use: 'uso del idioma',
};

/**
 * StarMap Preview (Especificación §7.2): experiencia pública e informativa.
 * No captura voz, no persiste respuestas y NO decide la ubicación definitiva.
 */
@Controller('preview')
export class PreviewController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('items')
  async items(): Promise<unknown> {
    const items = await this.prisma.diagnosticItem.findMany({
      where: { code: { in: PREVIEW_ITEM_CODES } },
      orderBy: { orderIndex: 'asc' },
    });
    return items.map((item) => {
      const prompt = item.prompt as { stem?: string; options?: string[] };
      return {
        code: item.code,
        skill: item.skill,
        prompt: prompt.stem ?? '',
        options: prompt.options ?? [],
      };
    });
  }

  @Public()
  @Post('estimate')
  async estimate(@Body() body: unknown): Promise<PreviewEstimateResponse> {
    const request = parse(zPreviewEstimateRequest, body);
    const items = await this.prisma.diagnosticItem.findMany({
      where: { code: { in: PREVIEW_ITEM_CODES } },
    });
    const byCode = new Map(items.map((item) => [item.code, item]));

    const responses: PlacementResponse[] = [];
    for (const answer of request.answers) {
      const item = byCode.get(answer.itemCode);
      if (!item) continue;
      const answerKey = item.answerKey as { correctIndex?: number };
      responses.push({ skill: item.skill, correct: answer.selectedIndex === answerKey.correctIndex });
    }

    const estimate = estimatePlacement(responses);
    const bySkill = new Map<Skill, { correct: number; total: number }>();
    for (const response of responses) {
      const entry = bySkill.get(response.skill) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (response.correct) entry.correct += 1;
      bySkill.set(response.skill, entry);
    }
    const ranked = [...bySkill.entries()].sort(
      (a, b) => b[1].correct / b[1].total - a[1].correct / a[1].total,
    );
    const strength = ranked[0] ? SKILL_LABELS[ranked[0][0]] : 'lectura';
    const gap = ranked[ranked.length - 1] ? SKILL_LABELS[ranked[ranked.length - 1][0]] : 'escucha';

    return {
      band: estimate.overall,
      strength,
      gap,
      message:
        'Este es un vistazo orientativo de pocos minutos: no decide tu ubicación. El StarMap completo mide más habilidades, incluye escritura y una persona del equipo revisa tu resultado.',
    };
  }
}
