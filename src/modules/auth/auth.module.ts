import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { BlacklistService } from './blacklist.service';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '../../common/strategies/jwt-refresh.strategy';
import { jwtConstants } from '@/common/utils/jwt.constants';
import { timeConverter } from '@/common/utils/utils';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    TypeOrmModule.forFeature([BlacklistedToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN', '15m');
        const expiresInSeconds = timeConverter(expiresIn);
        
        return {
          secret: configService.get<string>(`${jwtConstants.jwtAccessSecret}`),
          signOptions: { 
            expiresIn: expiresInSeconds
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, BlacklistService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}