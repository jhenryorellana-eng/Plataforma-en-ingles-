import { Logger } from '@nestjs/common';
import { createConfiguredApp } from './create-app';
import { loadConfig } from './config/config';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await createConfiguredApp();
  await app.listen({ port: config.apiPort, host: '0.0.0.0' });
  new Logger('Bootstrap').log(`API STAR escuchando en http://localhost:${config.apiPort}/v1`);
}

void bootstrap();
