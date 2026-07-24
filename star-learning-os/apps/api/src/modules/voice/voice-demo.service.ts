import { createHmac } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { AppError } from '../../common/errors';
import { loadConfig } from '../../config/config';
import { OpenAiRealtimeProvider } from './openai-realtime.provider';
import {
  composePublicVoiceDemoInstructions,
  PUBLIC_VOICE_DEMO_PROMPT_VERSION,
} from './voice-demo.prompt';

const REALTIME_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
const PUBLIC_DEMO_DURATION_SECONDS = 60;

export interface VoiceDemoCallResponse {
  mode: 'realtime';
  answerSdp: string;
  durationSeconds: number;
  promptVersion: string;
}

/**
 * La llamada pública se crea en servidor. A diferencia de las misiones
 * autenticadas, el navegador nunca recibe ni la API key ni un secreto efímero;
 * además, el servidor conserva el call_id para imponer el corte de costo.
 */
@Injectable()
export class VoiceDemoService {
  private readonly logger = new Logger(VoiceDemoService.name);

  async createCall(ip: string, offerSdp: string): Promise<VoiceDemoCallResponse> {
    const config = loadConfig();
    if (!config.openaiApiKey) {
      throw new AppError(
        'INTERNAL',
        503,
        'La demostración de voz no está disponible por el momento. Inténtalo más tarde.',
      );
    }

    // Identificador seudónimo estable para seguridad del proveedor. La IP nunca
    // abandona el servidor y el resultado no permite recuperarla.
    const safetyIdentifier = createHmac('sha256', config.sessionSecret)
      .update(`public-voice-demo:${ip}`)
      .digest('hex')
      .slice(0, 32);
    const provider = new OpenAiRealtimeProvider(config.openaiApiKey);
    const ephemeral = await provider.createEphemeralSession({
      model: config.realtimeModelPublicDemo,
      voice: config.realtimeVoice,
      instructions: composePublicVoiceDemoInstructions(),
      safetyIdentifier,
      expiresAfterSeconds: 90,
      reasoningEffort: 'low',
      turnDetection: {
        type: 'semantic_vad',
        eagerness: 'auto',
        create_response: true,
        // Evita que eco residual o ruido ambiente cancele una frase a mitad.
        // El micrófono permanece abierto y el siguiente turno se conserva.
        interrupt_response: false,
      },
    });

    const response = await fetch(
      `${ephemeral.callUrl}?model=${encodeURIComponent(config.realtimeModelPublicDemo)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeral.clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offerSdp,
      },
    );
    if (!response.ok) {
      const providerErrorBody = await response.text();
      let providerCode = 'unknown';
      try {
        const parsed = JSON.parse(providerErrorBody) as {
          error?: { code?: string; param?: string };
        };
        providerCode = [parsed.error?.code, parsed.error?.param].filter(Boolean).join(':') || 'unknown';
      } catch {
        // El cuerpo del proveedor no se registra: puede cambiar sin aviso.
      }
      this.logger.error(
        `OpenAI Realtime calls respondió ${response.status} (${providerCode})`,
      );
      throw new AppError(
        'INTERNAL',
        502,
        'No se pudo conectar la demostración de voz. Inténtalo nuevamente.',
      );
    }

    const location = response.headers.get('location') ?? '';
    const callId = location.split('/').filter(Boolean).at(-1);
    if (!callId || !/^rtc_[a-zA-Z0-9_-]+$/.test(callId)) {
      this.logger.error('OpenAI Realtime no devolvió un call_id válido');
      throw new AppError('INTERNAL', 502, 'No se pudo asegurar el límite de la demostración.');
    }

    const cutoff = setTimeout(() => {
      void this.hangUp(config.openaiApiKey, callId);
    }, PUBLIC_DEMO_DURATION_SECONDS * 1000);
    cutoff.unref();

    return {
      mode: 'realtime',
      answerSdp: await response.text(),
      durationSeconds: PUBLIC_DEMO_DURATION_SECONDS,
      promptVersion: PUBLIC_VOICE_DEMO_PROMPT_VERSION,
    };
  }

  private async hangUp(apiKey: string, callId: string): Promise<void> {
    try {
      const response = await fetch(`${REALTIME_CALLS_URL}/${encodeURIComponent(callId)}/hangup`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok && response.status !== 404) {
        this.logger.warn(`No se pudo cortar la demo Realtime (${response.status})`);
      }
    } catch {
      this.logger.warn('No se pudo contactar al proveedor para cortar la demo Realtime');
    }
  }
}
