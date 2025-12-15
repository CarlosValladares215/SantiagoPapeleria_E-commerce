import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Listen on port 4000
  await app.listen(4000);
  console.log('🚀 DobraNet Simulator running on http://localhost:4000');
}
bootstrap();
