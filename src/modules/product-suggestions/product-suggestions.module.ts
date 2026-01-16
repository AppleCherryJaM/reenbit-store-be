import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { Product } from '../products/entities/product.entity';
import { ProductsModule } from '../products/products.module';
import { CategorySuggestionsController } from './category-suggestions.controller';
import { ProductSuggestionsController } from './product-suggestions.controller';
import { ProductSuggestionsService } from './product-suggestions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    CategoriesModule,
    ProductsModule, 
  ],
  providers: [ProductSuggestionsService],
  controllers: [
    ProductSuggestionsController,
    CategorySuggestionsController,
  ],
  exports: [ProductSuggestionsService],
})
export class ProductSuggestionsModule {}