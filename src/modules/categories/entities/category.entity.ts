import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,

  JoinColumn,
  Tree,
  TreeChildren,
  TreeParent,
  TreeLevelColumn,
} from 'typeorm';

@Entity('categories')
@Tree('materialized-path') // Используем materialized-path для лучшей производительности
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ name: 'order_index', default: 0 })
  orderIndex: number;

  @TreeParent({ onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @TreeChildren()
  children: Category[];

  @TreeLevelColumn()
  level: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}