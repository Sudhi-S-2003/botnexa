import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for web dashboard, embedded widgets, and external developers
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // OpenAPI / Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('BotNexa API')
    .setDescription('Multi-Tenant AI Chatbot SaaS Platform API documentation')
    .setVersion('1.0')
    .addServer('https://botnexa.onrender.com/botnexa-api', 'Render Production Gateway (/botnexa-api/)')
    .addServer('http://localhost:3001', 'Local / Internal Development Server')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .addApiKey({ type: 'apiKey', name: 'x-api-secret', in: 'header' }, 'x-api-secret')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 BotNexa Server running on internal port: ${port}`);
  console.log(`📖 Swagger API Docs available at: https://botnexa.onrender.com/botnexa-api/api-docs`);
}

bootstrap();
