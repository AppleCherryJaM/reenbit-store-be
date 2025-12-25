import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';

export class ProductDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @IsOptional()
  @IsNumber()
  brandId?: number;

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}