/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { AuthResponse, JwtPayload } from './types/auth.types';
import { BlacklistService } from './blacklist.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly blacklistService: BlacklistService,
  ) {}

  async validateUser(email: string, password: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByEmail(email);

    if (user && (await bcrypt.compare(password, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      role: user.role,
    };

    const access_token = this.generateAccessToken(payload);
    const refresh_token = this.generateRefreshToken(payload);

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = await this.usersService.create({
      ...registerDto,
      phone: registerDto.phone,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const newPayload: JwtPayload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      role: user.role,
    };

    const access_token = this.generateAccessToken(newPayload);
    const refresh_token = this.generateRefreshToken(newPayload);

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async logout(
    userId: number,
    refreshToken?: string,
  ): Promise<{
    message: string;
    invalidatedCount?: number;
  }> {
    try {
      let invalidatedCount = 0;

      if (refreshToken) {
        await this.blacklistService.addToBlacklist(refreshToken);
        invalidatedCount++;
      }

      const result = this.blacklistService.logoutUser(userId);
      invalidatedCount += result.invalidatedCount;

      return {
        message: 'Logged out successfully',
        invalidatedCount,
      };
    } catch (error) {
      console.error('Logout failed:', error);
      return { message: 'Logged out with errors' };
    }
  }

  async validateUserById(id: number): Promise<User | null> {
    try {
      return await this.usersService.findById(id);
    } catch {
      return null;
    }
  }

  private generateAccessToken(payload: JwtPayload): string {
    const expiresIn = parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '900');

    return this.jwtService.sign(
      { ...payload, jti: uuid4() },
      {
        secret: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
        expiresIn,
      },
    );
  }

  private generateRefreshToken(payload: JwtPayload): string {
    const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    return this.jwtService.sign(payload as any, {
      secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      expiresIn: expiresIn as any,
    });
  }
}
