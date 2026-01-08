import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number = 0;

  @ApiPropertyOptional({ 
    description: 'Product image URLs', 
    type: [String],
    example: ['http://example.com/image1.jpg', 'http://example.com/image2.jpg']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];


  @IsNumber()
  brandId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  categoryIds: number[];
}