import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // CORS: public read-only reference data consumed by the app (and Expo web in dev).
  const app = await NestFactory.create(AppModule, { cors: true });
  const port = Number(process.env['PORT'] ?? 3000);
  await app.listen(port);
  console.log(`knowledgebase API listening on :${port}`);
}

void bootstrap();
