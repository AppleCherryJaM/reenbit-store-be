import { IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({ 
    example: 'refresh_token_here', 
    required: false,
    description: 'Refresh token to invalidate (optional)' 
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsOptional()
  refresh_token?: string;
}