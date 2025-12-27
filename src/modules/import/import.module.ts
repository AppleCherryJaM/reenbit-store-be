import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { CategoriesModule } from '../categories/categories.module';
import { BrandsModule } from '../brands/brands.module';
import { ImportController } from './import.controller';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    CategoriesModule,
    BrandsModule,
    ProductsModule,
  ],
	controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}