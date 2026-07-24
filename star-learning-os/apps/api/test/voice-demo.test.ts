import assert from 'node:assert/strict';
import test from 'node:test';
import { PUBLIC_RATE_LIMITS } from '../src/common/local-rate-limit.service';
import {
  composePublicVoiceDemoInstructions,
  PUBLIC_VOICE_DEMO_PROMPT_VERSION,
} from '../src/modules/voice/voice-demo.prompt';

test('la demo pública declara IA, audiencia adulta y práctica breve sin pedir datos', () => {
  const prompt = composePublicVoiceDemoInstructions();

  assert.match(PUBLIC_VOICE_DEMO_PROMPT_VERSION, /^public-guardian-demo-/);
  assert.match(prompt, /mentora educativa de voz con IA/i);
  assert.match(prompt, /un minuto/i);
  assert.match(prompt, /madre, padre o apoderado adulto/i);
  assert.match(prompt, /I can learn English\./);
  assert.match(prompt, /acento latinoamericano neutro/i);
  assert.match(prompt, /Una respuesta del participante en inglés es parte del ejercicio/i);
  assert.match(prompt, /Responde a lo que realmente oíste/i);
  assert.match(prompt, /Después de dos intentos/i);
  assert.match(prompt, /crear su cuenta familiar/i);
  assert.match(prompt, /Si no entendiste el audio, pide amablemente que repita/i);
  assert.match(prompt, /adulto responsable/i);
  assert.match(prompt, /no solicites datos personales ni información sobre un menor/i);
});

test('la demo pública limita cada IP a tres sesiones por día', () => {
  assert.deepEqual(PUBLIC_RATE_LIMITS.voiceDemo, {
    windowMs: 24 * 60 * 60 * 1000,
    maxPerIp: 3,
    maxPerIdentifier: 3,
  });
});
