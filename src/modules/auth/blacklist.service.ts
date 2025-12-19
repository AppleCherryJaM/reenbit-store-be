/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { JwtService } from '@nestjs/jwt';
import { JwtDecodedPayload } from './types/auth.types';

@Injectable()
export class BlacklistService {
  constructor(
    @InjectRepository(BlacklistedToken)
    private blacklistRepository: Repository<BlacklistedToken>,
    private jwtService: JwtService,
  ) {
    this.scheduleCleanup();
  }

  private scheduleCleanup() {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setInterval(() => this.cleanupExpiredTokens(), 6 * 60 * 60 * 1000);
  }

  async addToBlacklist(token: string, reason: string = 'logout'): Promise<BlacklistedToken | null> {
    try {
      const decoded = this.jwtService.decode(token) as JwtDecodedPayload;

      if (!decoded || !decoded.exp) {
        throw new Error('Invalid token: cannot decode');
      }

      const expiresAt = new Date(decoded.exp * 1000);

      if (expiresAt < new Date()) {
        console.log('Token already expired, skipping blacklist');
        return null;
      }

      const existing = await this.blacklistRepository.findOne({
        where: { token },
      });

      if (existing) {
        return existing;
      }

      const blacklistedToken = this.blacklistRepository.create({
        token,
        userId: decoded.sub,
        expiresAt,
        reason,
      });

      const savedToken = await this.blacklistRepository.save(blacklistedToken);
      console.log(`Token for user ${decoded.sub} added to blacklist (reason: ${reason})`);

      return savedToken;
    } catch (error) {
      console.error('Failed to blacklist token:', error);
      throw error;
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklistedToken = await this.blacklistRepository.findOne({
        where: { token },
      });

      if (!blacklistedToken) {
        return false;
      }

      if (blacklistedToken.expiresAt < new Date()) {
        await this.blacklistRepository.remove(blacklistedToken);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check token blacklist:', error);
      return false;
    }
  }

  logoutUser(userId: number, reason: string = 'logout'): { invalidatedCount: number } {
    try {
      // TO DO: create kill all user sessions

      console.log(`User ${userId} logged out (reason: ${reason})`);

      // For now, we simply return 0, since we don't have a session table.
      // In the future, we might implement:
      // 1. A user_sessions table
      // 2. Adding all active refresh tokens to the blacklist
      // 3. Marking all sessions as inactive

      return { invalidatedCount: 0 };
    } catch (error) {
      console.error('Failed to logout user:', error);
      return { invalidatedCount: 0 };
    }
  }

  async getUserBlacklistedTokens(userId: number): Promise<BlacklistedToken[]> {
    return this.blacklistRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.blacklistRepository
        .createQueryBuilder()
        .delete()
        .where('expires_at < :now', { now: new Date() })
        .execute();

      const deletedCount = result.affected || 0;
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} expired tokens`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup expired tokens:', error);
      return 0;
    }
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    expired: number;
  }> {
    const now = new Date();

    const [total, active, expired] = await Promise.all([
      this.blacklistRepository.count(),
      this.blacklistRepository.count({
        where: { expiresAt: { $gte: now } as any },
      }),
      this.blacklistRepository.count({
        where: { expiresAt: { $lt: now } as any },
      }),
    ]);

    return { total, active, expired };
  }
}
