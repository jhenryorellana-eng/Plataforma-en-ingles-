import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/exception.filter';
import { loadConfig } from './config/config';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: ['log', 'warn', 'error'],
  });

  await app.register(fastifyCookie);
  app.enableCors({
    origin: config.webOrigin,
    credentials: true,
    // @fastify/cors solo permite GET,HEAD,POST por defecto; la API usa PATCH (ritmo).
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('v1');
  app.useGlobalFilters(new AppExceptionFilter());
  app.enableShutdownHooks();

  await app.listen({ port: config.apiPort, host: '0.0.0.0' });
  new Logger('Bootstrap').log(`API STAR escuchando en http://localhost:${config.apiPort}/v1`);
}

void bootstrap();
