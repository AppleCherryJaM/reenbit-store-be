/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CategoriesService } from '../categories/categories.service';
import { BrandsService } from '../brands/brands.service';
import { XmlProductDto } from '../import/dto/xml-product.dto';

@Injectable()
export class ProductsService {
  constructor(

    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    private categoriesService: CategoriesService,
    private brandsService: BrandsService,
  ) {}

  async findAll(): Promise<Product[]> {
    return this.productRepository.find({
      relations: ['brand', 'categories'],
    });
  }

  async upsert(dto: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    categoryName: string; 
    brandName: string;    
  }): Promise<Product> {
    const { name, description, price, stock, categoryName, brandName } = dto;

    const [category, brand] = await Promise.all([
      this.categoriesService.findOrCreateByName(categoryName),
      this.brandsService.findOrCreateByName(brandName),
    ]);

    let product = await this.productRepository.findOne({
      where: { name },
      relations: ['categories'],
    });

    if (product) {

      product.description = description;
      product.price = price;
      product.stock = stock;
      product.brand = brand;

      product.categories = [category];
    } else {

      product = this.productRepository.create({
        name,
        description,
        price,
        stock,
        brand,
        categories: [category],
      });
    }

    return this.productRepository.save(product);
  }

  async bulkUpsert(dtos: Array<XmlProductDto>): Promise<void> {
    const allCategoryNames = [...new Set(dtos.flatMap(dto => dto.categoryNames))];
    const brandNames = [...new Set(dtos.map(dto => dto.brandName))];

    const [brands, categories] = await Promise.all([
      this.brandsService.bulkFindOrCreateBrands(brandNames),
      this.categoriesService.bulkFindOrCreateCategories(allCategoryNames),
    ]);

    const brandMap = new Map(brands.map(b => [b.name, b.id]));
    const categoryMap = new Map(categories.map(c => [c.name, c.id]));

    const products = dtos.map(dto => {
      const product = this.productRepository.create({
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        brand: { id: brandMap.get(dto.brandName)! },
        categories: dto.categoryNames.map(name => ({ id: categoryMap.get(name)! })),
      });
      return product;
    });

    await this.productRepository.save(products, { chunk: 100 });
  }
}