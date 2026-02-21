import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { SanitizeInputPipe } from './common/security/pipes/sanitize-input.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  app.useLogger(app.get(Logger));

  // app.setGlobalPrefix('api/v1'); // Временно убрал для диагностики

  app.use(helmet());

  const corsOrigin = configService.get<string>('corsOrigin') ?? '*';
  app.enableCors({
    origin:
      corsOrigin === '*'
        ? true
        : corsOrigin
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const nodeEnv = configService.get<string>('nodeEnv');
  const swaggerEnabled = configService.get<boolean>('swaggerEnabled') ?? true;
  if (nodeEnv !== 'production' && swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('GradeBook API')
      .setDescription('Production-ready backend for GradeBook mobile app')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  app.enableShutdownHooks();

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
}
void bootstrap();
