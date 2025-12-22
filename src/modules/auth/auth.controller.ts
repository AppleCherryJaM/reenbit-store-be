 
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthResponse } from './types/auth.types';
import { Throttle } from '@nestjs/throttler';

interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  
  @Throttle({ default: { limit: 3, ttl: 10000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password',
  })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login successful',
    type: AuthResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
  })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return await this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User registration',
    description: 'Create a new user account',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'User registered successfully',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        name: 'John Doe',
        role: 'customer',
        avatarUrl: null,
        phone: null,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiConflictResponse({
    description: 'Email already exists',
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
  })
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get new access and refresh tokens using refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({
    description: 'Token refreshed successfully',
    type: AuthResponse,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid refresh token',
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
  })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponse> {
    return await this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user and invalidate refresh token',
  })
  @ApiBody({ type: LogoutDto })
  @ApiOkResponse({
    description: 'Logout successful',
    schema: {
      example: {
        message: 'Logged out successfully',
        invalidatedCount: 1,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
  })
  async logout(@Req() req: RequestWithUser, @Body() logoutDto?: LogoutDto) {
    return await this.authService.logout(req.user.id, logoutDto?.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user info',
    description: 'Get authenticated user information',
  })
  @ApiOkResponse({
    description: 'Current user data',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        name: 'John Doe',
        role: 'customer',
        avatarUrl: null,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized',
  })
  getCurrentUser(@Req() req: RequestWithUser) {
    return req.user;
  }
}
