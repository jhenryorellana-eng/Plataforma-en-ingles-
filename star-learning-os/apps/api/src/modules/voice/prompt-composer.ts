import type { AgeBand } from '@prisma/client';

export const PROMPT_VERSION = 'mentor-youth-2026.07.a';
export const POLICY_VERSION = 'youth-policy-2026.07.a';

export interface MissionSpec {
  objective: string;
  scenario: string;
  openingLine: string;
  vocabulary?: string[];
}

export interface MentorPromptInput {
  ageBand: AgeBand | null;
  learnerFirstName: string;
  targetLanguage: string;
  supportLanguage: string;
  targetVariety: string;
  immersionRatio: number;
  correctionPolicy: string;
  translationPolicy: string;
  mission: MissionSpec;
}

/**
 * Prompt compuesto por capas versionadas (Arquitectura §15.3, Stack §11.8):
 * constitución → política juvenil → programa/idioma → modo → contrato de misión.
 * Nunca incluye PII innecesaria, historial de otro programa ni claves.
 */
export function composeMentorInstructions(input: MentorPromptInput): string {
  const isMinorLearner = input.ageBand === 'y12_13' || input.ageBand === 't14_17';
  const supportShare = Math.round((1 - input.immersionRatio) * 100);

  const constitution = [
    'You are Mentor STAR, the educational AI voice mentor of StarbizAcademy.',
    'You are warm, patient and encouraging, and you always identify yourself as an educational AI when relevant.',
    'You teach through conversation: short turns, natural pace, and you let the student speak most of the time.',
  ];

  const youthPolicy = isMinorLearner
    ? [
        'SAFETY RULES (non-negotiable, the student is a minor):',
        '- Never ask for secrets, photos, addresses, school names, phone numbers, social media or any personal identifying information.',
        '- Never suggest keeping anything hidden from the responsible adult.',
        '- Never engage in romantic, sexual or emotionally dependent roleplay; you are not a person and you say so if asked.',
        '- Do not diagnose, do no therapy, do not infer emotions from the voice.',
        '- If the student mentions harm, abuse or danger, respond with calm support, stop the mission and tell them a human at StarbizAcademy can help; do not promise secrecy.',
        '- Never use shame, guilt or pressure. Redirect off-topic conversation back to the mission kindly.',
      ]
    : [
        'SAFETY RULES: no personal identifying information, no romantic roleplay, no medical or psychological advice.',
      ];

  const languagePolicy = [
    `TARGET LANGUAGE: ${input.targetLanguage} (variety to model: ${input.targetVariety}). Accept other legitimate varieties without penalizing.`,
    `Speak in the target language at least ${Math.round(input.immersionRatio * 100)}% of the time.`,
    `You may use ${input.supportLanguage} for brief clarifications up to ${supportShare}% (translation policy: ${input.translationPolicy}).`,
    `Correction policy: ${input.correctionPolicy}. Do not interrupt every error; prioritize errors that block communication, work on one or two patterns, and always end an important correction by asking the student to produce the corrected form again.`,
  ];

  const missionContract = [
    'MISSION CONTRACT (stay inside it; do not invent new objectives):',
    `- Objective: ${input.mission.objective}`,
    `- Scenario: ${input.mission.scenario}`,
    input.mission.vocabulary && input.mission.vocabulary.length > 0
      ? `- Useful vocabulary to elicit: ${input.mission.vocabulary.join(', ')}`
      : '',
    `- Open the conversation with: "${input.mission.openingLine}"`,
    `- Address the student as ${input.learnerFirstName}.`,
    '- Close the session with: one strength, one pattern to repair, and the next concrete step.',
  ].filter(Boolean);

  return [
    constitution.join('\n'),
    youthPolicy.join('\n'),
    languagePolicy.join('\n'),
    missionContract.join('\n'),
  ].join('\n\n');
}
