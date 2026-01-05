import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
  ParseBoolPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { OptionalIntPipe } from '@/common/pipes/optional-int.pipe';
import { OptionalFloatPipe } from '@/common/pipes/optional-float.pipe';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiQuery({ 
    name: 'sortBy', 
    required: false, 
    enum: ['price_asc', 'price_desc', 'newest', 'name_asc', 'rating_desc', 'rating_asc'],
    description: 'Products sorting options'
  })
  @ApiQuery({ 
    name: 'minPrice', 
    required: false, 
    type: Number,
    description: 'Minimum price' 
  })
  @ApiQuery({ 
    name: 'maxPrice', 
    required: false, 
    type: Number,
    description: 'Maximum price' 
  })
  @ApiQuery({ 
    name: 'ratings', 
    required: false, 
    type: String,
    description: 'Ratings using coma separator (e.g. 1,2,3)' 
  })
  @ApiQuery({ 
    name: 'brandIds', 
    required: false, 
    type: String,
    description: 'Brands Id using coma separator (e.g. 1,2,3)' 
  })
  @ApiQuery({ 
    name: 'categoryIds', 
    required: false, 
    type: String,
    description: 'Category IDs using comma separator (e.g. 1,2,3)' 
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('brandId', OptionalIntPipe) brandId?: number,
    @Query('brandIds') brandIds?: string,
    @Query('categoryId', OptionalIntPipe) categoryId?: number,
    @Query('categoryIds') categoryIds?: string,
    @Query('search') search?: string,
    @Query('includeChildren', new DefaultValuePipe(true), ParseBoolPipe) includeChildren?: boolean,
    @Query('sortBy') sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc' | 'rating_desc' | 'rating_asc',
    @Query('minPrice', OptionalFloatPipe) minPrice?: number,
    @Query('maxPrice', OptionalFloatPipe) maxPrice?: number,
    @Query('ratings') ratings?: string,
  ) {
    const safeLimit = Math.min(limit, 50);

    let parsedBrandIds: number[] | undefined;
    if (brandIds) {
      parsedBrandIds = brandIds.split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
    }

    let parsedCategoryIds: number[] | undefined;
    if (categoryIds) {
      parsedCategoryIds = categoryIds.split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
    }

    let parsedRatings: number[] | undefined;
    if (ratings) {
      parsedRatings = ratings.split(',')
        .map(r => parseFloat(r.trim()))
        .filter(r => !isNaN(r) && r >= 0 && r <= 5);
    }

    return this.productsService.findAll(
      page, 
      safeLimit, 
      brandId, 
      categoryId, 
      search,
      includeChildren,
      sortBy,
      minPrice,
      maxPrice,
      parsedBrandIds,
      parsedCategoryIds,
      parsedRatings
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID (public)' })
  @ApiResponse({ status: 200, type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findById(@Param('id', ParseIntPipe) id: number): Promise<Product | null> {
    return this.productsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @ApiOperation({ summary: 'Create product' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: Product })
  create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  @ApiOperation({ summary: 'Update product' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: Product })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete product' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productsService.delete(id);
  }
}