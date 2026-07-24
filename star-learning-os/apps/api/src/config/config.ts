import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { withDatabaseConnectionLimit } from './database-url';

// Carga .env desde la raíz del monorepo tanto en dev (tsx src/) como en build (dist/).
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const LOCAL_DATABASE_URL = 'postgresql://postgres@127.0.0.1:55432/star';
const DEV_SESSION_SECRET = 'dev-only-secret-change-in-production';

const configSchema = z.object({
  DATABASE_URL: z.string().default(LOCAL_DATABASE_URL),
  /** Máximo por proceso; deja margen en pools compartidos y réplicas. */
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(15).default(3),
  API_PORT: z.coerce.number().int().default(4000),
  /** Puerto inyectado por Railway y otros runtimes; tiene prioridad sobre API_PORT. */
  PORT: z.coerce.number().int().optional(),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  SESSION_SECRET: z.string().min(8).default(DEV_SESSION_SECRET),
  OPENAI_API_KEY: z.string().optional().default(''),
  /** Alias lógico del modelo de texto para autoría (ADR-M009); vacío = plantillas. */
  OPENAI_TEXT_MODEL: z.string().optional().default(''),
  REALTIME_MODEL_TUTOR_PRIMARY: z.string().default('gpt-realtime'),
  /** Demo pública de un minuto: modelo Realtime completo para máxima fluidez de voz. */
  REALTIME_MODEL_PUBLIC_DEMO: z.string().default('gpt-realtime-2.1'),
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
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ENABLE_DEV_LOGIN: z
    .string()
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
  OUTBOX_DISPATCH_MODE: z.enum(['local-log', 'preserve', 'webhook']).optional(),
  OUTBOX_WEBHOOK_URL: z.string().optional().default(''),
  OUTBOX_WEBHOOK_SECRET: z.string().optional().default(''),
  /** Solo permite preserve en producción durante mantenimiento operativo explícito. */
  OUTBOX_MAINTENANCE_MODE: z
    .string()
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
});

type RawConfig = z.infer<typeof configSchema>;

function assertWebhookConfig(config: RawConfig): void {
  if (config.OUTBOX_DISPATCH_MODE !== 'webhook') return;
  const errors: string[] = [];
  try {
    if (new URL(config.OUTBOX_WEBHOOK_URL).protocol !== 'https:') {
      errors.push('OUTBOX_WEBHOOK_URL debe usar HTTPS');
    }
  } catch {
    errors.push('OUTBOX_WEBHOOK_URL debe ser una URL válida');
  }
  if (config.OUTBOX_WEBHOOK_SECRET.length < 32) {
    errors.push('OUTBOX_WEBHOOK_SECRET debe tener al menos 32 caracteres aleatorios');
  }
  if (errors.length > 0) {
    throw new Error(`Configuración de webhook inválida: ${errors.join('; ')}`);
  }
}

function assertProductionConfig(config: RawConfig): void {
  if (config.NODE_ENV !== 'production') return;
  const errors: string[] = [];
  if (config.DATABASE_URL === LOCAL_DATABASE_URL || !/^postgres(ql)?:\/\//.test(config.DATABASE_URL)) {
    errors.push('DATABASE_URL debe apuntar al PostgreSQL de producción');
  }
  if (config.SESSION_SECRET === DEV_SESSION_SECRET || config.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET debe ser aleatorio y tener al menos 32 caracteres');
  }
  try {
    if (new URL(config.WEB_ORIGIN).protocol !== 'https:') errors.push('WEB_ORIGIN debe usar HTTPS');
  } catch {
    errors.push('WEB_ORIGIN debe ser una URL válida');
  }
  if (!config.SUPABASE_URL || !config.SUPABASE_PUBLISHABLE_KEY || !config.SUPABASE_SECRET_KEY) {
    errors.push('Supabase Auth requiere URL, publishable key y secret key');
  } else {
    try {
      if (new URL(config.SUPABASE_URL).protocol !== 'https:') errors.push('SUPABASE_URL debe usar HTTPS');
    } catch {
      errors.push('SUPABASE_URL debe ser una URL válida');
    }
  }
  if (config.OUTBOX_DISPATCH_MODE !== 'webhook') {
    if (!(config.OUTBOX_DISPATCH_MODE === 'preserve' && config.OUTBOX_MAINTENANCE_MODE)) {
      errors.push('OUTBOX_DISPATCH_MODE=webhook es obligatorio en produccion');
    }
  }
  if (errors.length > 0) {
    throw new Error(`Configuración de producción inválida: ${errors.join('; ')}`);
  }
}

export interface AppConfig {
  databaseUrl: string;
  apiPort: number;
  webOrigin: string;
  sessionSecret: string;
  openaiApiKey: string;
  openaiTextModel: string;
  realtimeModelTutorPrimary: string;
  realtimeModelPublicDemo: string;
  realtimeVoice: string;
  zdrVerified: boolean;
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  devLoginEnabled: boolean;
  isProduction: boolean;
  outboxDispatchMode: 'local-log' | 'preserve' | 'webhook';
  outboxWebhookUrl: string;
  outboxWebhookSecret: string;
  outboxMaintenanceMode: boolean;
}

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const parsed = configSchema.parse(process.env);
  assertWebhookConfig(parsed);
  assertProductionConfig(parsed);
  const isProduction = parsed.NODE_ENV === 'production';
  cached = {
    databaseUrl: withDatabaseConnectionLimit(parsed.DATABASE_URL, parsed.DATABASE_POOL_SIZE),
    apiPort: parsed.PORT ?? parsed.API_PORT,
    webOrigin: parsed.WEB_ORIGIN,
    sessionSecret: parsed.SESSION_SECRET,
    openaiApiKey: parsed.OPENAI_API_KEY,
    openaiTextModel: parsed.OPENAI_TEXT_MODEL,
    realtimeModelTutorPrimary: parsed.REALTIME_MODEL_TUTOR_PRIMARY,
    realtimeModelPublicDemo: parsed.REALTIME_MODEL_PUBLIC_DEMO,
    realtimeVoice: parsed.REALTIME_VOICE,
    zdrVerified: parsed.ZDR_VERIFIED,
    supabaseUrl: parsed.SUPABASE_URL,
    supabasePublishableKey: parsed.SUPABASE_PUBLISHABLE_KEY,
    supabaseSecretKey: parsed.SUPABASE_SECRET_KEY,
    devLoginEnabled: !isProduction && parsed.ENABLE_DEV_LOGIN,
    isProduction,
    outboxDispatchMode: parsed.OUTBOX_DISPATCH_MODE ?? (isProduction ? 'webhook' : 'local-log'),
    outboxWebhookUrl: parsed.OUTBOX_WEBHOOK_URL,
    outboxWebhookSecret: parsed.OUTBOX_WEBHOOK_SECRET,
    outboxMaintenanceMode: parsed.OUTBOX_MAINTENANCE_MODE,
  };
  process.env.DATABASE_URL = cached.databaseUrl;
  return cached;
}

export const APP_CONFIG = 'APP_CONFIG';
