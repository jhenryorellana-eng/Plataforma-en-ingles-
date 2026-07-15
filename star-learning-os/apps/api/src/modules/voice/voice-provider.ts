export interface EphemeralSessionInput {
  model: string;
  voice: string;
  instructions: string;
  /** Identificador seudónimo estable; nunca PII (Stack §8.3). */
  safetyIdentifier: string;
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
