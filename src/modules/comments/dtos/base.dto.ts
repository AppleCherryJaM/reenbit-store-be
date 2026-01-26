import { ApiProperty } from '@nestjs/swagger';

export class AuthorDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false, nullable: true })
  avatarUrl?: string;
}

export class BaseCommentDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  content: string;

  @ApiProperty({ enum: ['review', 'question', 'answer'] })
  type: string;

  @ApiProperty({ required: false, nullable: true })
  rating?: number;

  @ApiProperty()
  isVerifiedPurchase: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: () => AuthorDto })
  author: AuthorDto;
}