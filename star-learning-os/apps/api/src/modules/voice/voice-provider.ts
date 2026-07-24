export interface EphemeralSessionInput {
  model: string;
  voice: string;
  instructions: string;
  /** Identificador seudónimo estable; nunca PII (Stack §8.3). */
  safetyIdentifier: string;
  /** Reduce la ventana en la que un secreto interceptado puede iniciar una llamada. */
  expiresAfterSeconds?: number;
  /** Tope por respuesta; el cliente no puede elevarlo cuando el secreto queda en servidor. */
  maxOutputTokens?: number;
  /** Nivel de razonamiento recomendado para equilibrar fluidez y latencia. */
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  /** Configuración de turnos fijada por el servidor antes de entregar el secreto. */
  turnDetection?: {
    type: 'server_vad' | 'semantic_vad';
    eagerness?: 'low' | 'medium' | 'high' | 'auto';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
    create_response?: boolean;
    interrupt_response?: boolean;
  };
}

export interface EphemeralSessionResult {
  clientSecret: string;
  expiresAt: string;
  callUrl: string;
  providerCallId: string | null;
}

/**
 * Adaptador de proveedor de voz (Arquitectura §6.1): la clave estándar vive
 * SOLO en servidor; el navegador recibe únicamente un secreto efímero.
 */
export interface VoiceProvider {
  readonly name: string;
  createEphemeralSession(input: EphemeralSessionInput): Promise<EphemeralSessionResult>;
}
