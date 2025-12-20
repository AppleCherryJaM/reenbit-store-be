import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { corsConfig, port } from './main.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(corsConfig);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

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

  if (process.env.NODE_ENV !== 'production') {
    try {
      writeFileSync(
        join(__dirname, '..', 'openapi.json'),
        JSON.stringify(document, null, 2),
      );
       console.log('OpenAPI spec generated at: openapi.json');
    } catch (error) {
      console.error('Failed to generate OpenAPI spec:', error);
    }
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

  await app.listen(port);
  console.log(`Application is running on port: ${port}`);
}
bootstrap();
