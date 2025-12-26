import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ 
    example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8',
    description: 'Verification token'
  })
  @IsUUID()
  token: string;
}