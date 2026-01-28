import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { corsConfig, port } from './main.config';
import { raw } from 'express';

async function bootstrap() {

  const app = await NestFactory.create(AppModule, {
    snapshot: true, 
    rawBody: true,
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn', 'log'] 
      : ['debug', 'error', 'warn', 'log', 'verbose'],
  });

  // eslint-disable-next-line @typescript-eslint/require-await
  const loadHeavyModules = async () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    app.use(helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
    }));
  };

  await loadHeavyModules();

  app.enableCors(corsConfig);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (process.env.ENABLE_XML_IMPORT === 'true') {
    app.use('/admin/import', 
      raw({ 
        type: ['application/xml', 'text/xml', 'text/yaml'],
        limit: '10mb' 
      })
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Reenbit Store API')
      .setDescription('API documentation for Reenbit Store application')
      .setVersion('1.0')
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management endpoints')
      .addTag('products', 'Product management endpoints')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);

    try {
      writeFileSync(
        join(__dirname, '..', 'openapi.json'),
        JSON.stringify(document, null, 2),
      );
      console.log('OpenAPI spec generated at: openapi.json');
    } catch (error) {
      console.error('Failed to generate OpenAPI spec:', error);
    }

    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Food Store API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
      customfavIcon: '/favicon.ico',
    });
  }

  if (process.env.CHECK_ENV !== 'false') {
    const requiredEnvVars = [
      'JWT_ACCESS_SECRET',
      'JWT_REFRESH_SECRET',
      'DB_HOST',
      'DB_USERNAME',
      'DB_PASSWORD',
      'DB_DATABASE',
    ];

    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingVars.length > 0) {
      console.error(`Missing required environment variables: ${missingVars.join(', ')}`);

      if (process.env.NODE_ENV === 'production') {
        console.warn('Continuing in production mode despite missing env vars');
      } else {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }
    }
  }

  await app.listen(port);
  console.log(`Application is running on port: ${port}`);

  if (process.env.NODE_ENV !== 'production') {
    const used = process.memoryUsage();
    console.log('Memory usage:');
    for (const [key, value] of Object.entries(used)) {
      console.log(`${key}: ${Math.round(value / 1024 / 1024 * 100) / 100} MB`);
    }
  }
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();