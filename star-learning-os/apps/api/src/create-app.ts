import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/exception.filter';
import { loadConfig } from './config/config';

/** Configuración completa de la app, compartida por el server (main.ts) y el handler serverless. */
export async function createConfiguredApp(): Promise<NestFastifyApplication> {
  const config = loadConfig();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true, bodyLimit: 1_048_576 }),
    { logger: ['log', 'warn', 'error'] },
  );

  await app.register(fastifyCookie);
  app.enableCors({
    origin: config.webOrigin,
    credentials: true,
    // @fastify/cors solo permite GET,HEAD,POST por defecto; la API usa PATCH (ritmo).
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('v1');
  const fastify = app.getHttpAdapter().getInstance() as FastifyInstance;
  fastify.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Star-Contract-Version', 'guardian-first-v1');
    reply.header(
      'X-Star-Build-Sha',
      process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? 'development',
    );
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'camera=(), geolocation=(), payment=()');
    if (config.isProduction) {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return payload;
  });
  app.useGlobalFilters(new AppExceptionFilter());
  app.enableShutdownHooks();
  return app;
}
