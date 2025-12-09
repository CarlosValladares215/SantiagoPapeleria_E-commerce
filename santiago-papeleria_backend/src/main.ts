import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilitar la validación global de DTOs y transformación de tipos
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve propiedades que no están definidas en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no definidas
      transform: true, // Asegura que los tipos se transformen correctamente (ej. string a number)
    }),
  );

  // Habilitar CORS para permitir peticiones desde el frontend (Angular)
  app.enableCors();

  await app.listen(3000);
}
bootstrap();
