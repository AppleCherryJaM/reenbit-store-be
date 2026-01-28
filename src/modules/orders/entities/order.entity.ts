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
import { OrderStatus, DeliveryType, PaymentStatus } from '../types/order.types';

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

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

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
    paymentIntentId?: string;
    clientSecret?: string;
    stripeCustomerId?: string;
    paymentMethod?: string;
    receiptUrl?: string;
  };

  @Column({ nullable: true })
  paymentIntentId?: string;

  @Column({ type: 'timestamp', nullable: true })
  paidAt?: Date;

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

  isPaid(): boolean {
    return this.paymentStatus === PaymentStatus.PAID;
  }

  isPendingPayment(): boolean {
    return this.paymentStatus === PaymentStatus.PENDING;
  }

  canBePaid(): boolean {
    return (
      this.status !== OrderStatus.CANCELLED &&
      this.paymentStatus === PaymentStatus.PENDING &&
      this.totalAmount > 0
    );
  }

  updatePaymentInfo(paymentData: {
    paymentIntentId: string;
    clientSecret?: string;
    stripeCustomerId?: string;
    paymentMethod?: string;
    receiptUrl?: string;
  }): void {
    this.paymentIntentId = paymentData.paymentIntentId;
    this.paymentInfo = {
      ...this.paymentInfo,
      paymentIntentId: paymentData.paymentIntentId,
      clientSecret: paymentData.clientSecret,
      stripeCustomerId: paymentData.stripeCustomerId,
      paymentMethod: paymentData.paymentMethod,
      receiptUrl: paymentData.receiptUrl,
      method: 'stripe',
      status: 'pending',
    };
  }

  markAsPaid(receiptUrl?: string): void {
    this.paymentStatus = PaymentStatus.PAID;
    this.paidAt = new Date();
    
    if (this.paymentInfo) {
      this.paymentInfo.status = 'paid';
      if (receiptUrl) {
        this.paymentInfo.receiptUrl = receiptUrl;
      }
    }
  }

  markAsCancelled(): void {
    this.paymentStatus = PaymentStatus.CANCELLED;
    
    if (this.paymentInfo) {
      this.paymentInfo.status = 'cancelled';
    }
  }
}