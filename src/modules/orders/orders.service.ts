import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
  ) {}

  async hasUserPurchasedProduct(userId: number, productId: number): Promise<boolean> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .innerJoin('item.product', 'product')
      .where('order.user_id = :userId', { userId })
      .andWhere('product.id = :productId', { productId })
      .andWhere('order.status = :status', { status: OrderStatus.COMPLETED })
      .getOne();

    return !!order;
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOrderById(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['user', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  async createTestOrder(userId: number, productId: number): Promise<Order> {
    // Метод для создания тестового заказа (можно удалить в продакшене)
    const order = this.orderRepository.create({
      orderNumber: `TEST-${Date.now()}`,
      user: { id: userId },
      status: OrderStatus.COMPLETED,
      totalAmount: 99.99,
      items: [
        this.orderItemRepository.create({
          product: { id: productId },
          quantity: 1,
          unitPrice: 99.99,
        })
      ],
    });

    return this.orderRepository.save(order);
  }
}