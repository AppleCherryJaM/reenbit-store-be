import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('blacklisted_tokens')
@Index(['token'], { unique: true })
@Index(['userId'])
export class BlacklistedToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  token: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'reason', nullable: true })
  reason?: string; // 'logout', 'security', 'refresh' и т.д.
}