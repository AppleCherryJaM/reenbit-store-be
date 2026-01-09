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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsNumber()
  brandId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  categoryIds: number[];
}