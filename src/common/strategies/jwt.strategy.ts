import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../../modules/auth/auth.service';
import { jwtConstants } from '../utils/jwt.constants';
import { BlacklistService } from '@/modules/auth/blacklist.service';

interface JwtPayload {
  email: string;
  sub: number;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
  jti: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService, 
    private readonly blackListService: BlacklistService
  ) {
    const secret = configService.get<string>(jwtConstants.jwtAccessSecret);

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUserById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isBlacklisted = await this.blackListService.isTokenBlacklisted(payload.jti);
    
    if (isBlacklisted) {
      throw new UnauthorizedException('Token revoked');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  }
}