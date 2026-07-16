import { z } from 'zod';

/**
 * Contrato de salida del generador de lecciones (IA o mock). Codifica la
 * estructura pedagógica de la Metodología: objetivo observable, secuencia
 * STAR y actividades con transferencia. El generador NUNCA inventa
 * competencias: el tema es contexto, el mapa no cambia.
 */
export const zGeneratedActivity = z.object({
  kind: z.enum(['mcq', 'gap_fill', 'writing_prompt', 'voice_mission']),
  skill: z.enum(['reading', 'listening', 'speaking', 'writing', 'language_use']),
  isTransferVariant: z.boolean().default(false),
  supportLevel: z.enum(['guided', 'independent']).default('independent'),
  instructions: z.string(),
  transcript: z.string().optional(),
  stem: z.string().optional(),
  options: z.array(z.string()).min(3).max(5).optional(),
  correctIndex: z.number().int().min(0).optional(),
  explanation: z.string().optional(),
  text: z.string().optional(),
  accepted: z.array(z.array(z.string()).min(1)).optional(),
  hints: z.array(z.string()).optional(),
  scenario: z.string().optional(),
  minWords: z.number().int().optional(),
  requiredElements: z.array(z.string()).optional(),
  objective: z.string().optional(),
  openingLine: z.string().optional(),
  vocabulary: z.array(z.string()).optional(),
  mockScript: z.array(z.string()).optional(),
});
export type GeneratedActivity = z.infer<typeof zGeneratedActivity>;

export const zGeneratedLesson = z.object({
  objective: z.string().min(10),
  unitTheme: z.string(),
  immersionRatio: z.number().min(0.3).max(1).default(0.7),
  timeboxSeconds: z.number().int().min(300).max(2400).default(900),
  activities: z.array(zGeneratedActivity).min(3).max(7),
});
export type GeneratedLesson = z.infer<typeof zGeneratedLesson>;

export interface AuthoringRequest {
  topic: string;
  notes?: string;
  cefrLevel: string;
  /** Habilidades cuyas competencias existen en el programa (el mapa fijo). */
  availableSkills: string[];
}

export interface AuthoringProvider {
  readonly name: string;
  generateLesson(request: AuthoringRequest): Promise<GeneratedLesson>;
}
