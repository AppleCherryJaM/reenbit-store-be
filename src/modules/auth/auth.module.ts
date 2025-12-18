import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { BlacklistService } from './blacklist.service';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { JwtRefreshStrategy } from '../../common/strategies/jwt-refresh.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    TypeOrmModule.forFeature([BlacklistedToken]), // Добавьте эту строку!
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET || 'default_access_secret',
      signOptions: { 
        expiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '900')
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, BlacklistService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}