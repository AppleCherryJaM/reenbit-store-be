import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Product } from '../entities/product.entity';

export enum SuggestionStrategy {
  SMART = 'smart',
  CATEGORIES = 'categories',
  BRAND = 'brand',
  PRICE = 'price',
  POPULAR = 'popular',
}

export class ProductSuggestionsQueryDto {
  @ApiProperty({
    description: 'Number of suggestions',
    default: 12,
    required: false,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 12;

  @ApiProperty({
    description: 'Strategy for generating suggestions',
    enum: SuggestionStrategy,
    default: SuggestionStrategy.SMART,
    required: false,
  })
  @IsOptional()
  @IsEnum(SuggestionStrategy)
  strategy?: SuggestionStrategy = SuggestionStrategy.SMART;

  @ApiProperty({
    description: 'Include same brand products',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeBrand?: boolean = true;

  @ApiProperty({
    description: 'Price range percentage',
    default: 30,
    required: false,
    minimum: 10,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  @Type(() => Number)
  priceRangePercent?: number = 30;

  @ApiProperty({
    description: 'Minimum rating for popular products',
    default: 4.0,
    required: false,
    minimum: 0,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  minRating?: number = 4.0;

  @ApiProperty({
    description: 'Comma-separated product IDs to exclude',
    required: false,
  })
  @IsOptional()
  excludeIds?: string;
}

export class SuggestionGroupDto {
  @ApiProperty({ description: 'Similar products based on categories' })
  similar: Product[];

  @ApiProperty({ description: 'Products frequently bought together' })
  frequentlyBought: Product[];

  @ApiProperty({ description: 'Products other customers also viewed' })
  alsoViewed: Product[];

  @ApiProperty({ description: 'Products with similar style/features', required: false })
  sameStyle?: Product[];

  @ApiProperty({ description: 'Popular products in same categories' })
  popular: Product[];
}

export class ProductSuggestionsResponseDto {
  @ApiProperty({ description: 'Product ID' })
  productId: number;

  @ApiProperty({ description: 'Product name' })
  productName: string;

  @ApiProperty({ description: 'Product brand' })
  productBrand: string;

  @ApiProperty({ description: 'Product categories' })
  productCategories: string[];

  @ApiProperty({ description: 'Groups of suggestions' })
  suggestions: SuggestionGroupDto;

  @ApiProperty({ description: 'Strategy used' })
  strategy: string;

  @ApiProperty({ description: 'Total suggestions count' })
  total: number;

  @ApiProperty({ description: 'Generation timestamp' })
  timestamp: string;
}