import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  const port = process.env.PORT || 4000;
  // Listen on port
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 DobraNet Simulator running on http://localhost:${port}`);
}
bootstrap();
