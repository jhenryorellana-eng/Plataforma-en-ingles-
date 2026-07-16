import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Carga .env desde la raíz del monorepo tanto en dev (tsx src/) como en build (dist/).
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const configSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://postgres@127.0.0.1:55432/star'),
  API_PORT: z.coerce.number().int().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  SESSION_SECRET: z.string().min(8).default('dev-only-secret-change-in-production'),
  OPENAI_API_KEY: z.string().optional().default(''),
  /** Alias lógico del modelo de texto para autoría (ADR-M009); vacío = plantillas. */
  OPENAI_TEXT_MODEL: z.string().optional().default(''),
  REALTIME_MODEL_TUTOR_PRIMARY: z.string().default('gpt-realtime'),
  REALTIME_VOICE: z.string().default('marin'),
  ZDR_VERIFIED: z
    .string()
    .default('false')
    .transform((value) => value === 'true'),
  /** Supabase Auth: sin las 3 variables, el login con contraseña corre en modo mock (solo dev). */
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional().default(''),
  SUPABASE_SECRET_KEY: z.string().optional().default(''),
  /** El acceso demo sin contraseña JAMÁS se habilita en producción. */
  NODE_ENV: z.string().optional().default('development'),
});

export interface AppConfig {
  databaseUrl: string;
  apiPort: number;
  webOrigin: string;
  sessionSecret: string;
  openaiApiKey: string;
  openaiTextModel: string;
  realtimeModelTutorPrimary: string;
  realtimeVoice: string;
  zdrVerified: boolean;
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  devLoginEnabled: boolean;
}

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const parsed = configSchema.parse(process.env);
  cached = {
    databaseUrl: parsed.DATABASE_URL,
    apiPort: parsed.API_PORT,
    webOrigin: parsed.WEB_ORIGIN,
    sessionSecret: parsed.SESSION_SECRET,
    openaiApiKey: parsed.OPENAI_API_KEY,
    openaiTextModel: parsed.OPENAI_TEXT_MODEL,
    realtimeModelTutorPrimary: parsed.REALTIME_MODEL_TUTOR_PRIMARY,
    realtimeVoice: parsed.REALTIME_VOICE,
    zdrVerified: parsed.ZDR_VERIFIED,
    supabaseUrl: parsed.SUPABASE_URL,
    supabasePublishableKey: parsed.SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: parsed.SUPABASE_SECRET_KEY,
    devLoginEnabled: parsed.NODE_ENV !== 'production',
  };
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = cached.databaseUrl;
  }
  return cached;
}

export const APP_CONFIG = 'APP_CONFIG';
