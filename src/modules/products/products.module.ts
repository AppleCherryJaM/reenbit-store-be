import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Brand } from '../brands/entities/brand.entity';
import { CategoriesModule } from '../categories/categories.module';
import { BrandsModule } from '../brands/brands.module';
import { ProductSuggestionsController } from '../product-suggestions/product-suggestions.controller';
import { ProductSuggestionsService } from '../product-suggestions/product-suggestions.service';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, Brand]),
    CategoriesModule,
    BrandsModule,
  ],
  providers: [
    ProductsService,
    ProductSuggestionsService,
  ],
  controllers: [
    ProductsController,
    ProductSuggestionsController,
  ],
  exports: [ProductsService, ProductSuggestionsService],
})
export class ProductsModule {}