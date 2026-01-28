import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BrandsModule } from './modules/brands/brands.module';
import { ProductsModule } from './modules/products/products.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ImportModule } from './modules/import/import.module';
import { MailService } from './modules/mail/mail.service';
import { MailModule } from './modules/mail/mail.module';
import { CommentsModule } from './modules/comments/comments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductSuggestionsModule } from './modules/product-suggestions/product-suggestions.module';
import { CategorySuggestionsController } from './modules/product-suggestions/category-suggestions.controller';
import { StripeModule } from './modules/stripe/stripe.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 60 seconds
          limit: 10, // 10 requests per ttl
          ignoreUserAgents: [/curl/i, /Postman/i], // for testing purposes
        },
      ],
    }),

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
        migrations: ['dist/migrations/*{.ts,.js}'],
        migrationsRun: true,
        ssl: {
          rejectUnauthorized: false,
        },
        logging: true,
      }),
    }),

    UsersModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    AuthModule,
    HealthModule,
    ImportModule,
    MailModule,
    CommentsModule,
    OrdersModule,
    ProductSuggestionsModule,
    StripeModule
  ],
  controllers: [AppController, CategorySuggestionsController],
  providers: [AppService, MailService],
})
export class AppModule {}
