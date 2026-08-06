import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser());

  app.setGlobalPrefix('api'); // Makes sure the request is coming from /api/...

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  ); // Helps strip unrequired fields from incoming requests

  app.enableCors({
    origin: process.env.WEB_URL ?? 'localhost:3001',
    credentials: true,
  }); // Lets frontend and backend communicate efficiently

  const port = process.env.PORT ?? '3000';
  await app.listen(port);

  console.log(`API running on http://${port}/api`);


}
void bootstrap();
