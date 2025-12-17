  import { Module } from '@nestjs/common';
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

  @Module({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env',
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
          synchronize: true,
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
    ],
    controllers: [AppController],
    providers: [AppService],
  })
  export class AppModule {}
