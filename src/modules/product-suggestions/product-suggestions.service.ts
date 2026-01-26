import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriesService } from '../categories/categories.service';
import { Product } from '../products/entities/product.entity';


export enum SuggestionType {
  SIMILAR = 'similar',
  FREQUENTLY_BOUGHT = 'frequently_bought',
  ALSO_VIEWED = 'also_viewed',
}

export interface SuggestionOptions {
  limit?: number;
  includeBrand?: boolean;
  priceRangePercent?: number;
  minRating?: number;
  excludeIds?: number[];
}

@Injectable()
export class ProductSuggestionsService {
  private readonly logger = new Logger(ProductSuggestionsService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private categoriesService: CategoriesService,
  ) {}

  async getSuggestions(
    productId: number,
    options: SuggestionOptions = {},
  ): Promise<Record<SuggestionType, Product[]>> {
    const product = await this.getProductWithRelations(productId);
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const {
      limit = 12,
      includeBrand = true,
      minRating = 4.0,
      excludeIds = [],
    } = options;

    const [similar, frequentlyBought, alsoViewed] = await Promise.all([
      this.findSimilarProducts(product, Math.ceil(limit / 2), includeBrand, excludeIds),
      this.findPopularInSameCategories(product, Math.ceil(limit / 3), minRating, excludeIds),
      this.findAlsoViewed(product, Math.ceil(limit / 3), minRating, excludeIds),
    ]);

    return {
      [SuggestionType.SIMILAR]: similar,
      [SuggestionType.FREQUENTLY_BOUGHT]: frequentlyBought,
      [SuggestionType.ALSO_VIEWED]: alsoViewed,
    };
  }

  private async findSimilarProducts(
    product: Product,
    limit: number,
    includeBrand: boolean,
    excludeIds: number[],
  ): Promise<Product[]> {
    const categoryIds = product.categories.map(c => c.id);
    
    if (categoryIds.length === 0) {
      return this.findPopularProducts(limit, 4.0, excludeIds);
    }

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.categories', 'categories')
      .where('product.id != :productId', { productId: product.id })
      .andWhere('categories.id IN (:...categoryIds)', { categoryIds })
      .andWhere('product.stock > 0');

    if (excludeIds.length > 0) {
      queryBuilder.andWhere('product.id NOT IN (:...excludeIds)', { excludeIds });
    }

    if (includeBrand && product.brand) {
      queryBuilder
        .addOrderBy('CASE WHEN brand.id = :brandId THEN 1 ELSE 2 END', 'ASC')
        .setParameter('brandId', product.brand.id);
    }

    queryBuilder
      .addOrderBy('product.rating', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .limit(limit);

    return queryBuilder.getMany();
  }

  private async findPopularInSameCategories(
    product: Product,
    limit: number,
    minRating: number,
    excludeIds: number[],
  ): Promise<Product[]> {
    const categoryIds = product.categories.map(c => c.id);
    
    if (categoryIds.length === 0) {
      return this.findPopularProducts(limit, minRating, excludeIds);
    }

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.categories', 'categories')
      .where('product.id != :productId', { productId: product.id })
      .andWhere('categories.id IN (:...categoryIds)', { categoryIds })
      .andWhere('product.rating >= :minRating', { minRating })
      .andWhere('product.stock > 0');

    if (excludeIds.length > 0) {
      queryBuilder.andWhere('product.id NOT IN (:...excludeIds)', { excludeIds });
    }

    queryBuilder
      .orderBy('product.rating', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .limit(limit);

    return queryBuilder.getMany();
  }

  private async findAlsoViewed(
    product: Product,
    limit: number,
    minRating: number,
    excludeIds: number[],
  ): Promise<Product[]> {
    const categoryIds = product.categories.map(c => c.id);
    
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.categories', 'categories')
      .where('product.id != :productId', { productId: product.id })
      .andWhere('product.rating >= :minRating', { minRating })
      .andWhere('product.stock > 0');

    if (categoryIds.length > 0) {
      queryBuilder.andWhere('categories.id NOT IN (:...categoryIds)', { categoryIds });
    }

    if (excludeIds.length > 0) {
      queryBuilder.andWhere('product.id NOT IN (:...excludeIds)', { excludeIds });
    }

    queryBuilder
      .orderBy('product.rating', 'DESC')
      .limit(limit);

    return queryBuilder.getMany();
  }

  private async findPopularProducts(
    limit: number,
    minRating: number,
    excludeIds: number[],
  ): Promise<Product[]> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.categories', 'categories')
      .where('product.rating >= :minRating', { minRating })
      .andWhere('product.stock > 0');

    if (excludeIds.length > 0) {
      queryBuilder.andWhere('product.id NOT IN (:...excludeIds)', { excludeIds });
    }

    queryBuilder
      .orderBy('product.rating', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .limit(limit);

    return queryBuilder.getMany();
  }

  async findPriceRangeSimilar(
    productId: number,
    limit: number = 6,
    priceRangePercent: number = 30,
  ): Promise<Product[]> {
    const product = await this.getProductWithRelations(productId);
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const priceRange = product.price * (priceRangePercent / 100);
    const minPrice = Math.max(product.price - priceRange, 0);
    const maxPrice = product.price + priceRange;

    const categoryIds = product.categories.map(c => c.id);
    
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.categories', 'categories')
      .where('product.id != :productId', { productId })
      .andWhere('product.price BETWEEN :minPrice AND :maxPrice', { 
        minPrice, 
        maxPrice 
      })
      .andWhere('product.stock > 0');

    if (categoryIds.length > 0) {
      queryBuilder.andWhere('categories.id IN (:...categoryIds)', { categoryIds });
    }

    queryBuilder
      .addOrderBy('ABS(product.price - :targetPrice)', 'ASC')
      .setParameter('targetPrice', product.price)
      .addOrderBy('product.rating', 'DESC')
      .limit(limit);

    return queryBuilder.getMany();
  }

  async getSimilarProducts(
    productId: number,
    limit: number = 6,
    includeBrand: boolean = true,
  ): Promise<Product[]> {
    const product = await this.getProductWithRelations(productId);
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.findSimilarProducts(product, limit, includeBrand, []);
  }

  async getFrequentlyBoughtTogether(
    productId: number,
    limit: number = 4,
  ): Promise<Product[]> {
    const product = await this.getProductWithRelations(productId);
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.findPopularInSameCategories(product, limit, 4.0, []);
  }

  async getPopularInCategory(
    categoryId: number,
    limit: number = 8,
    includeChildren: boolean = true,
  ): Promise<Product[]> {
    let categoryIds: number[];

    if (includeChildren) {
      categoryIds = await this.categoriesService.getAllDescendantIds(categoryId);
    } else {
      categoryIds = [categoryId];
    }

    if (categoryIds.length === 0) {
      return [];
    }

    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.categories', 'categories')
      .where('categories.id IN (:...categoryIds)', { categoryIds })
      .andWhere('product.rating >= :minRating', { minRating: 4.0 })
      .andWhere('product.stock > 0')
      .orderBy('product.rating', 'DESC')
      .addOrderBy('product.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }

  private async getProductWithRelations(productId: number): Promise<Product | null> {
    return this.productRepository.findOne({
      where: { id: productId },
      relations: ['brand', 'categories'],
    });
  }
}