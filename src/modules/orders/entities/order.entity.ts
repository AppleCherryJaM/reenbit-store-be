import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from '../types/order.types';
import { DeliveryType } from '../types/order.types';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  orderNumber?: string;

  @ManyToOne(() => User, (user) => user.orders, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ nullable: true })
  guestId?: string;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CART,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: DeliveryType,
    default: DeliveryType.PICKUP,
  })
  deliveryType: DeliveryType;

  @Column({ nullable: true })
  deliveryAddress?: string;

  @Column({ type: 'jsonb', nullable: true })
  deliveryOptions?: {
    date?: string;
    timeSlot?: string;
    notes?: string;
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  customerName?: string;

  @Column({ nullable: true })
  customerEmail?: string;

  @Column({ nullable: true })
  customerPhone?: string;

  @Column({ type: 'jsonb', nullable: true })
  paymentInfo?: {
    method?: string;
    status?: string;
    transactionId?: string;
  };

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt?: Date;

  @Column({ name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @Column({ nullable: true })
  notes?: string;

  isCart(): boolean {
    return this.status === OrderStatus.CART;
  }

  canCheckout(): boolean {
    return this.isCart() && this.items.length > 0;
  }

  calculateTotal(): number {
    return this.items.reduce((total, item) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  }
}