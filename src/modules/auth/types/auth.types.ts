import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BaseUserResponse {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'customer' })
  role: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string;
}

export class ExtendedUserResponse extends BaseUserResponse {
  @ApiPropertyOptional({ example: '+1234567890' })
  phone?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class JwtPayload {
  @ApiProperty()
  email: string;

  @ApiProperty()
  sub: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;
}

export class JwtDecodedPayload extends JwtPayload {
  @ApiProperty()
  exp: number;

  @ApiProperty()
  iat: number;
}

export class AuthResponse {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  access_token: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
  })
  refresh_token: string;

  @ApiProperty({ type: BaseUserResponse })
  user: BaseUserResponse;
}

export class RegisterResponse extends ExtendedUserResponse {}

export class LogoutResponse {
  @ApiProperty({ example: 'Logged out successfully' })
  message: string;

  @ApiPropertyOptional({ example: 1 })
  invalidatedCount?: number;
}

export class ErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Validation failed' })
  message: string;

  @ApiPropertyOptional({ 
    example: ['email must be an email', 'password must be longer than or equal to 6 characters'] 
  })
  errors?: string[];
}