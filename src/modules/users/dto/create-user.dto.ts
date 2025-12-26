import { IsEmail, IsNotEmpty, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
    required: true,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
    required: true,
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'password123',
    minLength: 6,
    description: 'User password',
    required: true,
  })
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: '+1234567890',
    required: false,
    description: 'User phone number',
  })
  @IsOptional()
  phone?: string;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    required: false,
    description: 'User avatar URL',
  })
  @IsOptional()
  avatarUrl?: string;

  isVerified: boolean;
}
