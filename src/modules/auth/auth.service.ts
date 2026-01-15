import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { AuthResponse, JwtPayload } from './types/auth.types';
import { BlacklistService } from './blacklist.service';
import { MailService } from '../mail/mail.service';
import { VerificationPayload } from './dto/verification-payload.dto';
import { SendgridService } from './sendgrid/sendgrid.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly blacklistService: BlacklistService,
    private readonly mailService: MailService,
    private readonly sendgridService: SendgridService,
    // private readonly resendService: ResendService
  ) {}

  async verifyEmail(token: string): Promise<void> {
    let payload: VerificationPayload;

    try {
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_VERIFICATION_SECRET || 'verification_secret',
      });
    } catch (error) {
      this.logger.error(`email verification failed: ${error}`);
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const user = await this.usersService.findByEmail(payload.email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      this.logger.log(`User ${user.email} already verified`);
      return;
    }

    user.isVerified = true;
    await this.usersService.update(user.id, { isVerified: true });
  }

  async validateUser(email: string, password: string): Promise<Omit<User, 'password'> | null> {
    
    const user = await this.usersService.findByEmail(email);
    
    if (!user || !user.isVerified) {
      throw new UnauthorizedException('Email not verified');
    }
    const isValid = await bcrypt.compare(password, user.password);
    
    return isValid ? user as Omit<User, 'password'> : null;
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
      isVerified: false,
    });

    try {
      const verificationToken = this.jwtService.sign(
        { sub: user.id, email: user.email },
        {
          secret: process.env.JWT_VERIFICATION_SECRET || 'verification_secret',
          expiresIn: '24h',
        },
      );
      
      await this.sendgridService.sendVerificationEmail(
        user.email, 
        user.name, 
        verificationToken
      );

    } catch (error) {
      this.logger.error('Failed to send verification email via Resend', error);
      // Можно сохранить пользователя, но залогировать ошибку
      // Или реализовать очередь писем
    }

    const result = user as Omit<User, 'password'>;
    return result;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token', (error as Error).message);
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
      this.logger.error('Logout failed', (error as Error).message);
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
    // '7d' = 7 * 24 * 60 * 60 = 604800 seconds
    const expiresIn = 604800;

    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
      expiresIn,
    });
  }
}
