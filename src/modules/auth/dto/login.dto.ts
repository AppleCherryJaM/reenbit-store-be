import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ 
    example: 'user@example.com',
    description: 'User email address',
    required: true
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'password123', 
    minLength: 6,
    description: 'User password',
    required: true
  })
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}