import { Logger } from '@nestjs/common';
import { AppError } from '../../common/errors';
import {
  zGeneratedLesson,
  type AuthoringProvider,
  type AuthoringRequest,
  type GeneratedLesson,
} from './generated-lesson';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

/** Prompt que codifica la Metodología STAR para el autor IA. */
function buildSystemPrompt(): string {
  return [
    'Eres el asistente de autoría curricular de StarbizAcademy (Metodología STAR Mastery).',
    'Creas UNA lección de inglés para adolescentes hispanohablantes de 12 a 17 años.',
    'Reglas NO negociables:',
    '- El objetivo es observable: empieza con "Al finalizar, el estudiante puede…".',
    '- Secuencia STAR: primero comprensión guiada (mcq con transcript), luego práctica (gap_fill), producción (writing_prompt) y una variante de TRANSFERENCIA (mcq con isTransferVariant=true y contexto DIFERENTE).',
    '- Incluye una voice_mission con scenario, openingLine, vocabulary (5 palabras) y mockScript (6 turnos del interlocutor).',
    '- Contextos apropiados para su edad: escuela, universidad temprana, clubes, cultura. Prohibido: contextos laborales adultos, romance, temas sensibles.',
    '- Instrucciones en español; contenido de práctica en inglés del nivel indicado.',
    '- El tema del docente es el CONTEXTO. No inventes competencias ni cambies el estándar.',
    'Responde SOLO un objeto JSON válido con esta forma exacta:',
    '{"objective":string,"unitTheme":string,"immersionRatio":number,"timeboxSeconds":number,"activities":[{"kind":"mcq|gap_fill|writing_prompt|voice_mission","skill":"reading|listening|speaking|writing|language_use","isTransferVariant":boolean,"supportLevel":"guided|independent","instructions":string,"transcript"?:string,"stem"?:string,"options"?:string[],"correctIndex"?:number,"explanation"?:string,"text"?:string,"accepted"?:string[][],"hints"?:string[],"scenario"?:string,"minWords"?:number,"requiredElements"?:string[],"objective"?:string,"openingLine"?:string,"vocabulary"?:string[],"mockScript"?:string[]}]}',
  ].join('\n');
}

/** Autor IA real (modelo de texto con salida estructurada, Especificación §10.2). */
export class OpenAiAuthoringProvider implements AuthoringProvider {
  readonly name = 'openai-authoring';
  private readonly logger = new Logger('OpenAIAuthoring');

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateLesson(request: AuthoringRequest): Promise<GeneratedLesson> {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          {
            role: 'user',
            content: `Tema sugerido por el docente: "${request.topic}". Nivel CEFR: ${request.cefrLevel}. Habilidades disponibles en el mapa: ${request.availableSkills.join(', ')}. ${request.notes ? `Notas del docente: ${request.notes}` : ''}`,
          },
        ],
      }),
    });
    if (!response.ok) {
      this.logger.error(`OpenAI authoring respondió ${response.status}`);
      throw new AppError('INTERNAL', 502, 'El autor IA no está disponible en este momento');
    }
    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    const parsed = zGeneratedLesson.safeParse(JSON.parse(data.choices[0]?.message?.content ?? '{}'));
    if (!parsed.success) {
      this.logger.error('La lección generada no cumple el contrato pedagógico');
      throw new AppError('INTERNAL', 502, 'La lección generada no pasó la validación; intenta de nuevo');
    }
    return parsed.data;
  }
}

/**
 * Autor de plantillas (sin API key): produce una lección coherente y demo-able
 * a partir del tema, con la misma estructura STAR. Marca explícita de borrador.
 */
export class TemplateAuthoringProvider implements AuthoringProvider {
  readonly name = 'template-authoring';

  async generateLesson(request: AuthoringRequest): Promise<GeneratedLesson> {
    const topic = request.topic.trim();
    const topicLower = topic.toLowerCase();
    const lesson: GeneratedLesson = {
      objective: `Al finalizar, el estudiante puede comprender información clave sobre ${topicLower}, pedir aclaraciones y responder por escrito con precisión de nivel ${request.cefrLevel}.`,
      unitTheme: topic,
      immersionRatio: 0.7,
      timeboxSeconds: 900,
      activities: [
        {
          kind: 'mcq',
          skill: 'listening',
          isTransferVariant: false,
          supportLevel: 'guided',
          instructions: `Lee (o escucha) el anuncio sobre ${topicLower} y responde.`,
          transcript: `Attention students: our new ${topic} program starts next Monday. Sessions will take place in Room 12 after classes. If you want to join, sign up at the school office before Friday and bring your student ID.`,
          stem: 'What must students do to join the program?',
          options: [
            'Pay a fee on Monday',
            'Sign up at the office before Friday with their ID',
            'Talk to the principal directly',
            'Nothing, everyone is enrolled automatically',
          ],
          correctIndex: 1,
          explanation: 'El anuncio pide inscribirse en la oficina antes del viernes con el carné.',
        },
        {
          kind: 'gap_fill',
          skill: 'language_use',
          isTransferVariant: false,
          supportLevel: 'guided',
          instructions: 'Completa con la forma correcta.',
          text: `If I ____ (have) time this week, I will join the ${topicLower} program. My friend already ____ (sign) up yesterday.`,
          accepted: [['have'], ['signed']],
          hints: ['condicional real', 'pasado simple'],
        },
        {
          kind: 'writing_prompt',
          skill: 'writing',
          isTransferVariant: false,
          supportLevel: 'independent',
          instructions: `Escribe un correo (60–120 palabras) a la coordinación preguntando por el programa de ${topicLower}: horario, requisitos y cómo inscribirte. Incluye saludo formal y agradecimiento.`,
          scenario: `Viste el anuncio del programa de ${topicLower} pero necesitas más información.`,
          minWords: 60,
          requiredElements: ['dear', 'thank'],
        },
        {
          kind: 'mcq',
          skill: 'reading',
          isTransferVariant: true,
          supportLevel: 'independent',
          instructions: 'Transferencia: un contexto nuevo. Lee y responde.',
          transcript:
            'Community library notice: the photography workshop scheduled for Saturday has been moved to Sunday at 10 a.m. Participants who cannot attend should email the coordinator to reserve a seat in the next session.',
          stem: 'What should participants do if they cannot attend on Sunday?',
          options: [
            'Come on Saturday instead',
            'Email the coordinator to reserve the next session',
            'Cancel their membership',
            'Wait outside the library',
          ],
          correctIndex: 1,
          explanation: 'El aviso pide escribir al coordinador para reservar la siguiente sesión.',
        },
        {
          kind: 'voice_mission',
          skill: 'speaking',
          isTransferVariant: false,
          supportLevel: 'independent',
          instructions: `Conversa con la coordinación sobre el programa de ${topicLower}.`,
          objective: `Pedir información sobre ${topicLower} y confirmar los pasos de inscripción`,
          scenario: `You are a student interested in the ${topic} program. Talk to the coordinator (the Mentor), ask about the schedule and requirements, and confirm how to sign up.`,
          openingLine: `Hi! I heard you have questions about the ${topic} program. How can I help you?`,
          vocabulary: ['schedule', 'requirements', 'sign up', 'deadline', 'coordinator'],
          mockScript: [
            `Hi! I heard you have questions about the ${topic} program. How can I help you?`,
            'Great question. We meet twice a week, on Tuesdays and Thursdays after classes.',
            'You only need your student ID and a signed permission form from your guardian.',
            'The deadline to sign up is this Friday at the school office.',
            'Exactly! Is there anything else you would like to know?',
            'Perfect. We hope to see you next Monday. Have a great day!',
          ],
        },
      ],
    };
    return zGeneratedLesson.parse(lesson);
  }
}
