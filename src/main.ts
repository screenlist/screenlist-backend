import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    forbidUnknownValues: true,
    stopAtFirstError: true,
    forbidNonWhitelisted: true
  })).enableCors({
    origin: process.env.CLIENT_URL
  })

  const PORT = Number(process.env.PORT) || 8080;
  await app.listen(PORT);
}
bootstrap();
