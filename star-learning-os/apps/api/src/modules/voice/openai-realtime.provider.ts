import { Logger } from '@nestjs/common';
import { AppError } from '../../common/errors';
import type { EphemeralSessionInput, EphemeralSessionResult, VoiceProvider } from './voice-provider';

const CLIENT_SECRETS_URL = 'https://api.openai.com/v1/realtime/client_secrets';
const CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
const DEFAULT_SECRET_TTL_SECONDS = 600;
const MIN_SECRET_TTL_SECONDS = 30;
const MAX_SECRET_TTL_SECONDS = 600;

interface ClientSecretResponse {
  value: string;
  expires_at: number;
  session?: { id?: string };
}

/** Implementación real sobre OpenAI Realtime (WebRTC + secreto efímero). */
export class OpenAiRealtimeProvider implements VoiceProvider {
  readonly name = 'openai-realtime';
  private readonly logger = new Logger('OpenAIRealtime');

  constructor(private readonly apiKey: string) {}

  async createEphemeralSession(input: EphemeralSessionInput): Promise<EphemeralSessionResult> {
    const secretTtlSeconds = Math.min(
      MAX_SECRET_TTL_SECONDS,
      Math.max(MIN_SECRET_TTL_SECONDS, input.expiresAfterSeconds ?? DEFAULT_SECRET_TTL_SECONDS),
    );
    const response = await fetch(CLIENT_SECRETS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Safety-Identifier': input.safetyIdentifier,
      },
      body: JSON.stringify({
        expires_after: { anchor: 'created_at', seconds: secretTtlSeconds },
        session: {
          type: 'realtime',
          model: input.model,
          instructions: input.instructions,
          output_modalities: ['audio'],
          ...(input.maxOutputTokens ? { max_output_tokens: input.maxOutputTokens } : {}),
          ...(input.reasoningEffort
            ? { reasoning: { effort: input.reasoningEffort } }
            : {}),
          audio: {
            ...(input.turnDetection
              ? { input: { turn_detection: input.turnDetection } }
              : {}),
            output: { voice: input.voice },
          },
        },
      }),
    });

    if (!response.ok) {
      this.logger.error(`OpenAI client_secrets respondió ${response.status}`);
      throw new AppError('INTERNAL', 502, 'No se pudo crear la sesión de voz con el proveedor');
    }

    const data = (await response.json()) as ClientSecretResponse;
    return {
      clientSecret: data.value,
      expiresAt: new Date(data.expires_at * 1000).toISOString(),
      callUrl: CALLS_URL,
      providerCallId: data.session?.id ?? null,
    };
  }
}

/** Modo demo sin clave: permite desarrollar toda la experiencia sin costo ni datos externos. */
export class MockVoiceProvider implements VoiceProvider {
  readonly name = 'mock';

  async createEphemeralSession(input: EphemeralSessionInput): Promise<EphemeralSessionResult> {
    const secretTtlSeconds = Math.min(
      MAX_SECRET_TTL_SECONDS,
      Math.max(MIN_SECRET_TTL_SECONDS, input.expiresAfterSeconds ?? DEFAULT_SECRET_TTL_SECONDS),
    );
    return {
      clientSecret: '',
      expiresAt: new Date(Date.now() + secretTtlSeconds * 1000).toISOString(),
      callUrl: '',
      providerCallId: null,
    };
  }
}
