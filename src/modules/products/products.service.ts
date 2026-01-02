import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Brand } from '../brands/entities/brand.entity';
import { CategoriesService } from '../categories/categories.service';
import { BrandsService } from '../brands/brands.service';
import { XmlProductDto } from '../import/dto/xml-product.dto';
import { ProductArrayOutputDto } from './dtos/product-output.dto';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    private categoriesService: CategoriesService,
    private brandsService: BrandsService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { name, description, price, stock, images = [], brandId, categoryIds } = createProductDto;

    const [brand, categories] = await Promise.all([
      this.brandsService.findById(brandId), 
      this.categoriesService.getRepository().find({ 
        where: { id: In(categoryIds) } 
      }),
    ]);

    if (categories.length !== categoryIds.length) {
      const foundIds = categories.map(c => c.id);
      const missingIds = categoryIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Categories not found: ${missingIds.join(', ')}`);
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

    if (brandId) {
      const brand = await this.brandsService.findById(brandId);
      product.brand = brand;
    }

    if (categoryIds !== undefined) {
      const categories = await this.categoriesService.getRepository().find({
        where: { id: In(categoryIds) }
      });
      
      if (categories.length !== categoryIds.length) {
        const foundIds = categories.map(c => c.id);
        const missingIds = categoryIds.filter(id => !foundIds.includes(id));
        throw new NotFoundException(`Categories not found: ${missingIds.join(', ')}`);
      }
      product.categories = categories;
    }

    Object.assign(product, updateData);
    return this.productRepository.save(product);
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

    const brandMap = new Map(brands.map(b => [b.name, b]));
    const categoryMap = new Map(categories.map(c => [c.name, c]));

    const products = dtos.map(dto => {
      const product = this.productRepository.create({
        name: dto.name,
        description: dto.description,
        price: dto.price,
        stock: dto.stock,
        brand: brandMap.get(dto.brandName)!, 
        categories: dto.categoryNames.map(name => categoryMap.get(name)!),
      });
      return product;
    });

    await this.productRepository.save(products, { chunk: 100 });
  }

  private async getBrandById(id: number): Promise<Brand> {
    return this.brandsService.findById(id);
  }

  private async getCategoriesByIds(ids: number[]): Promise<Category[]> {
    return this.categoriesService.getRepository().find({
      where: { id: In(ids) }
    });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    brandId?: number,
    categoryId?: number,
    search?: string,
    includeChildren: boolean = true,
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
      if (includeChildren) {
        const categoryIds = await this.categoriesService.getAllDescendantIds(categoryId);
        queryBuilder.andWhere('categories.id IN (:...categoryIds)', { categoryIds });
      } else {
        queryBuilder.andWhere('categories.id = :categoryId', { categoryId });
      }
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
      output = { message: 'Success', status: 200, result: products };
    } catch (error) {
      this.logger.error(`Error finding products by name: ${error}`);
      output = { message: 'Internal Server Error', status: 500, result: null };
    }
    return output;
  }

  async findByCategoryTree(
    categoryId: number, 
    page: number = 1, 
    limit: number = 10,
    brandId?: number,
    search?: string,
  ): Promise<{ products: Product[]; total: number; categoryInfo: any }> {
    const category = await this.categoriesService.findById(categoryId);
    
    const result = await this.findAll(page, limit, brandId, categoryId, search, true);
    
    const subcategories = await this.categoriesService.getChildren(categoryId);
    
    return {
      ...result,
      categoryInfo: {
        id: category.id,
        name: category.name,
        description: category.description,
        subcategories: subcategories.map(sub => ({
          id: sub.id,
          name: sub.name,
        }))
      }
    };
  }

  async updateProductCategories(
    productId: number, 
    categoryIds: number[],
    includeParentCategories: boolean = false
  ): Promise<Product> {
    const product = await this.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    let finalCategoryIds = categoryIds;

    if (includeParentCategories) {
      const allCategoryIds = new Set<number>();
      
      for (const categoryId of categoryIds) {
        allCategoryIds.add(categoryId);

        try {
          const breadcrumbs = await this.categoriesService.getBreadcrumbs(categoryId);
          breadcrumbs.forEach(cat => allCategoryIds.add(cat.id));
        } catch (error) {
          this.logger.warn(`Failed to get breadcrumbs for category ${categoryId}:`, error);
        }
      }
      
      finalCategoryIds = Array.from(allCategoryIds);
    }

    const categories = await this.categoriesService.getRepository().find({
      where: { id: In(finalCategoryIds) }
    });

    if (categories.length !== finalCategoryIds.length) {
      const foundIds = categories.map(c => c.id);
      const missingIds = finalCategoryIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Categories not found: ${missingIds.join(', ')}`);
    }

    product.categories = categories;
    return this.productRepository.save(product);
  }

  async getCategoryProductCounts(categoryId: number): Promise<{
    category: any;
    directCount: number;
    totalCount: number;
    bySubcategory: Array<{ id: number; name: string; count: number }>;
  }> {
    const category = await this.categoriesService.findById(categoryId);
    const subcategories = await this.categoriesService.getChildren(categoryId);
    
    const directResult = await this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.categories', 'category', 'category.id = :categoryId', { categoryId })
      .getCount();
    
    const categoryIds = await this.categoriesService.getAllDescendantIds(categoryId);
    const totalResult = await this.productRepository
      .createQueryBuilder('product')
      .innerJoin('product.categories', 'category')
      .where('category.id IN (:...categoryIds)', { categoryIds })
      .getCount();
    
    const bySubcategoryPromises = subcategories.map(async (sub) => {
      try {
        const subIds = await this.categoriesService.getAllDescendantIds(sub.id);
        const count = await this.productRepository
          .createQueryBuilder('product')
          .innerJoin('product.categories', 'category')
          .where('category.id IN (:...subIds)', { subIds })
          .getCount();
        
        return {
          id: sub.id,
          name: sub.name,
          count
        };
      } catch (error) {
        this.logger.warn(`Failed to count products for subcategory ${sub.id}:`, error);
        return {
          id: sub.id,
          name: sub.name,
          count: 0
        };
      }
    });
    
    const bySubcategory = await Promise.all(bySubcategoryPromises);
    
    return {
      category: {
        id: category.id,
        name: category.name,
        description: category.description
      },
      directCount: directResult,
      totalCount: totalResult,
      bySubcategory
    };
  }

  async delete(id: number): Promise<void> {
    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }
}