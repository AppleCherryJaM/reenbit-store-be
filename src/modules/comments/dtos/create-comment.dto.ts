/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { 
  IsString, 
  IsIn, 
  IsNumber, 
  IsOptional, 
  Min, 
  Max, 
  ValidateIf,
  IsNotEmpty,
  Length 
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ 
    description: 'Comment content',
    minLength: 5,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @Length(5, 2000)
  content: string;

  @ApiProperty({ 
    description: 'Comment type',
    enum: ['review', 'question'],
  })
  @IsIn(['review', 'question'])
  type: 'review' | 'question';

  @ApiProperty({ 
    description: 'Rating (required for reviews)',
    minimum: 0,
    maximum: 5,
    required: false,
  })
  @ValidateIf(o => o.type === 'review')
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;
}