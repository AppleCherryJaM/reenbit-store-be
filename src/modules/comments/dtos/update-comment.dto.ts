import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({ 
    description: 'Comment content',
    minLength: 5,
    maxLength: 2000,
    required: false,
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ 
    description: 'Rating (only for reviews)',
    minimum: 0,
    maximum: 5,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;
}