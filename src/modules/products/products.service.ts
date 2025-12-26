/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CategoriesService } from '../categories/categories.service';
import { BrandsService } from '../brands/brands.service';
import { XmlProductDto } from '../import/dto/xml-product.dto';
import { ProductArrayOutputDto } from './dtos/product-output.dto';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  brandRepository: any;
  categoryRepository: any;

  constructor(

    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    private categoriesService: CategoriesService,
    private brandsService: BrandsService,
  ) {}

  async findAll(
    page: number = 1,
    limit: number = 10,
    brandId?: number,
    categoryId?: number,
    search?: string
  ): Promise<{ products: Product[]; total: number }> {
    const skip = (page - 1) * limit;
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.categories', 'categories')
      .orderBy('product.createdAt', 'DESC');

    if (brandId) {
      queryBuilder.andWhere('brand.id = :brandId', { brandId });
    }

    if (categoryId) {
      queryBuilder.andWhere('categories.id = :categoryId', { categoryId });
    }

    if (search) {
      queryBuilder.andWhere('LOWER(product.name) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }

    const [products, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { products, total };
  }

  async findById(id: number): Promise<Product | null> {
    let result: Product | null = null;

    try {
      result = await this.productRepository.findOne({
        where: { id },
        relations: ['brand', 'categories'],
      });
    } catch (error) {
      this.logger.error(`Error finding products by ID: ${error}`);
    }

    return result;
  }

  async findProductByName(name: string): Promise<ProductArrayOutputDto> {
    let output: ProductArrayOutputDto;
    try {
      const products = await this.productRepository.find({
        where: { name },
        relations: ['brand', 'categories'],
      });
      output = { message: 'Success', status: 200, result: products}
    } catch (error) {
      this.logger.error(`Error finding products by name: ${error}`);
      output = { message: 'Internal Server Error', status: 500, result: null };
    }

    return output;
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

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { name, description, price, stock, images = [], brandId, categoryIds } = createProductDto;

    const [brand, categories] = await Promise.all([
      this.brandRepository.findOneBy({ id: brandId }),
      this.categoryRepository.findBy({ id: In(categoryIds) }),
    ]);

    if (!brand) {
      throw new NotFoundException(`Brand with ID ${brandId} not found`);
    }

    if (categories.length !== categoryIds.length) {
      throw new NotFoundException('One or more categories not found');
    }

    const product = this.productRepository.create({
      name,
      description,
      price,
      stock,
      images,
      brand,
      categories,
    });

    return this.productRepository.save(product);
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);

    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    
    const { brandId, categoryIds, ...updateData } = updateProductDto;

    if (brandId !== undefined) {
      const brand = await this.brandRepository.findOneBy({ id: brandId });
      if (!brand) {
        throw new NotFoundException(`Brand with ID ${brandId} not found`);
      }
      product.brand = brand;
    }

    if (categoryIds !== undefined) {
      const categories = await this.categoryRepository.findBy({ id: In(categoryIds) });
      if (categories.length !== categoryIds.length) {
        throw new NotFoundException('One or more categories not found');
      }
      product.categories = categories;
    }

    Object.assign(product, updateData);
    return this.productRepository.save(product);
  }

  async delete(id: number): Promise<void> {
    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }
}