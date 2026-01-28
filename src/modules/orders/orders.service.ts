/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, Not } from "typeorm";
import { Product } from "../products/entities/product.entity";
import { CreateOrderDto } from "./dtos/create-order.dto";
import { OrderItem } from "./entities/order-item.entity";
import { Order } from "./entities/order.entity";
import { OrderStatus, DeliveryType, PaymentStatus } from "./types/order.types";
import { StripeService } from "../stripe/stripe.service";
import { CreateGuestOrderDto } from "./dtos/create-guest-order.dto";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    
    private dataSource: DataSource,
    
    private stripeService: StripeService,
  ) {}

  async getCart(userId: number): Promise<Order> {
    const cart = await this.orderRepository.findOne({
      where: { 
        user: { id: userId },
        status: OrderStatus.CART 
      },
      relations: ['items', 'items.product'],
    });

    if (!cart) {
      return this.orderRepository.save(
        this.orderRepository.create({
          user: { id: userId },
          status: OrderStatus.CART,
          paymentStatus: PaymentStatus.PENDING,
          deliveryType: DeliveryType.PICKUP,
          totalAmount: 0,
          items: [],
        })
      );
    }

    return cart;
  }

  async addToCart(userId: number, productId: number, quantity: number): Promise<Order> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const cart = await this.getCart(userId);
    const product = await this.productRepository.findOneBy({ id: productId });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock for "${product.name}". Available: ${product.stock}`
      );
    }

    const existingItem = cart.items.find(item => item.product.id === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
      await this.orderItemRepository.save(existingItem);
    } else {
      const item = this.orderItemRepository.create({
        order: cart,
        product: product,
        quantity: quantity,
        unitPrice: product.price,
      });
      
      await this.orderItemRepository.save(item);
      cart.items.push(item);
    }

    product.stock -= quantity;
    await this.productRepository.save(product);

    cart.totalAmount = cart.calculateTotal();
    return this.orderRepository.save(cart);
  }

  async updateCartItem(userId: number, itemId: number, quantity: number): Promise<Order> {
    if (quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }

    const cart = await this.getCart(userId);
    const item = await this.orderItemRepository.findOne({
      where: { id: itemId },
      relations: ['order', 'product'],
    });
    
    if (!item) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    if (item.order.id !== cart.id) {
      throw new ForbiddenException('You can only modify items in your own cart');
    }

    const product = item.product;
    const quantityDifference = quantity - item.quantity;

    if (quantityDifference > 0 && product.stock < quantityDifference) {
      throw new BadRequestException(
        `Insufficient stock for "${product.name}". Available: ${product.stock}`
      );
    }

    if (quantity === 0) {
      await this.orderItemRepository.remove(item);
      cart.items = cart.items.filter(i => i.id !== itemId);
    } else {
      item.quantity = quantity;
      await this.orderItemRepository.save(item);
    }

    product.stock -= quantityDifference;
    await this.productRepository.save(product);

    cart.totalAmount = cart.calculateTotal();
    return this.orderRepository.save(cart);
  }

  async removeFromCart(userId: number, itemId: number): Promise<Order> {
    return this.updateCartItem(userId, itemId, 0);
  }

  async clearCart(userId: number): Promise<Order> {
    const cart = await this.getCart(userId);

    for (const item of cart.items) {
      const product = await this.productRepository.findOneBy({ id: item.product.id });
      if (product) {
        product.stock += item.quantity;
        await this.productRepository.save(product);
      }
    }

    await this.orderItemRepository.remove(cart.items);

    cart.totalAmount = 0;
    cart.items = [];
    
    return this.orderRepository.save(cart);
  }

  async checkoutCart(userId: number, deliveryInfo: Partial<CreateOrderDto>): Promise<{
    order: Order;
    paymentIntent: any;
  }> {
    const cart = await this.getCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    for (const item of cart.items) {
      const product = await this.productRepository.findOneBy({ id: item.product.id });
      if (!product || product.stock < item.quantity) {
        throw new BadRequestException(
          `Product "${item.product.name}" is no longer available in requested quantity`
        );
      }
    }

    cart.status = OrderStatus.PENDING;
    cart.orderNumber = this.generateOrderNumber();
    cart.paymentStatus = PaymentStatus.PENDING;
    
    if (deliveryInfo.deliveryType) {
      cart.deliveryType = deliveryInfo.deliveryType;
    }
    
    if (deliveryInfo.deliveryAddress) {
      cart.deliveryAddress = deliveryInfo.deliveryAddress;
    }

    const order = await this.orderRepository.save(cart);

    const customerEmail = order.customerEmail || (order.user ? order.user.email : undefined);

    if (!order.orderNumber) {
      throw new BadRequestException('Order number is required');
    }

    const paymentIntent = await this.stripeService.createPaymentIntent({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Math.round(order.totalAmount * 100),
      currency: 'usd',
      customerEmail: customerEmail,
      metadata: {
        orderId: order.id.toString(),
        userId: userId.toString(),
      },
    });

    if (!paymentIntent || !paymentIntent.paymentIntentId) {
      throw new BadRequestException('Failed to create payment intent');
    }

    order.paymentIntentId = paymentIntent.paymentIntentId;
    await this.orderRepository.save(order);

    return {
      order,
      paymentIntent,
    };
  }

  async createOrder(userId: number, dto: CreateOrderDto): Promise<{
    order: Order;
    paymentIntent?: any;
  }> {
    const { items } = dto;

    const productIds = items.map(item => item.productId);
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids: productIds })
      .getMany();

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(`Products not found: ${missingIds.join(', ')}`);
    }

    const productMap = new Map(products.map(p => [p.id, p]));

    let totalAmount = 0;
    const validatedItems: {product: Product; quantity: number}[] = [];

    for (const item of items) {
      const product: Product|undefined = productMap.get(item.productId);
      if (!product) continue;

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}`
        );
      }

      totalAmount += product.price * item.quantity;
      validatedItems.push({ product, quantity: item.quantity });
    }

    const orderData = await this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        user: { id: userId },
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        orderNumber: this.generateOrderNumber(),
        deliveryType: dto.deliveryType,
        deliveryAddress: dto.deliveryAddress,
        totalAmount,
      });

      const savedOrder = await manager.save(order);

      if (validatedItems.length > 0) {
        const orderItems = validatedItems.map(({ product, quantity }) => 
          manager.create(OrderItem, {
            order: savedOrder,
            product: product,
            quantity: quantity,
            unitPrice: product.price,
          })
        );

        await manager.save(orderItems);
      }

      for (const { product, quantity } of validatedItems) {
        product.stock -= quantity;
        await manager.save(product);
      }

      return savedOrder;
    });

    if (totalAmount > 0 && orderData.orderNumber) {
      try {
        const paymentIntent = await this.stripeService.createPaymentIntent({
          orderId: orderData.id,
          orderNumber: orderData.orderNumber,
          amount: Math.round(totalAmount * 100),
          currency: 'usd',
          customerEmail: orderData.user?.email,
          metadata: {
            orderId: orderData.id.toString(),
            userId: userId.toString(),
          },
        });

        orderData.paymentIntentId = paymentIntent.paymentIntentId;
        await this.orderRepository.save(orderData);

        return {
          order: orderData,
          paymentIntent,
        };
      } catch (error) {
        console.warn('Stripe payment intent creation failed:', error);
        return {
          order: orderData,
        };
      }
    }

    return {
      order: orderData,
    };
  }


  async getUserOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { 
        user: { id: userId },
        status: Not(OrderStatus.CART)
      },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOrderById(orderId: number, userId?: number): Promise<Order> {
    const where: {
      id: typeof orderId, 
      user?: { id: typeof userId }
    } = { id: orderId };
    
    if (userId) {
      where.user = { id: userId };
    }

    const order = await this.orderRepository.findOne({
      where,
      relations: ['user', 'items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Проверяем права доступа (если указан userId)
    if (userId && order.user?.id !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }

    return order;
  }

  async processSuccessfulPayment(orderId: number, paymentIntentId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.paymentIntentId !== paymentIntentId) {
      throw new BadRequestException('Payment intent ID mismatch');
    }

    const paymentResult = await this.stripeService.verifyPayment(paymentIntentId);
    
    if (!paymentResult.valid) {
      throw new BadRequestException(`Payment verification failed. Status: ${paymentResult.status}`);
    }

    const orderAmountInCents = Math.round(order.totalAmount * 100);
    if (paymentResult.amount !== orderAmountInCents) {
      throw new BadRequestException(`Payment amount mismatch. Expected: ${orderAmountInCents}, Got: ${paymentResult.amount}`);
    }

    order.status = OrderStatus.PROCESSING; 
    order.paymentStatus = PaymentStatus.PAID;
    order.paidAt = new Date();
    order.paymentIntentId = paymentIntentId;

    return this.orderRepository.save(order);
  }

  async cancelOrderPayment(orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.paymentIntentId) {
      try {
        await this.stripeService.cancelPaymentIntent(order.paymentIntentId);
      } catch (error) {
        console.warn('Failed to cancel Stripe payment intent:', error);
      }
    }

    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        const product = await this.productRepository.findOneBy({ id: item.product.id });
        if (product) {
          product.stock += item.quantity;
          await this.productRepository.save(product);
        }
      }
    }

    order.status = OrderStatus.CANCELLED;
    order.paymentStatus = PaymentStatus.CANCELLED;
    
    return this.orderRepository.save(order);
  }

  async getOrderPaymentInfo(orderId: number, userId?: number): Promise<{
    order: Order;
    paymentIntent?: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      metadata: any;
      succeeded: boolean;
    };
    stripeConfig: any;
  }> {
    const order = await this.findOrderById(orderId, userId);

    let paymentIntent: {
      id: string;
      status: string;
      amount: number;
      currency: string;
      metadata: any;
      succeeded: boolean;
    } | undefined = undefined;
    
    if (order.paymentIntentId) {
      try {
        paymentIntent = await this.stripeService.retrievePaymentIntent(order.paymentIntentId);
      } catch (error) {
        console.warn('Failed to retrieve payment intent:', error);
      }
    }

    const stripeConfig = this.stripeService.getPublicConfig();

    return {
      order,
      paymentIntent,
      stripeConfig,
    };
  }

  async createTestOrder(userId: number, productId: number): Promise<Order> {
    const product = await this.productRepository.findOneBy({ id: productId });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const result = await this.createOrder(userId, {
      items: [{ productId, quantity: 1 }],
      deliveryType: DeliveryType.PICKUP,
      deliveryAddress: 'Test address',
    });

    return result.order;
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${timestamp}-${random}`;
  }

  async cleanupOldCarts(days: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldCarts = await this.orderRepository.find({
      where: { 
        status: OrderStatus.CART,
        createdAt: Not(cutoffDate) as any,
      },
      relations: ['items'],
    });

    let deletedCount = 0;

    for (const cart of oldCarts) {
      for (const item of cart.items) {
        const product = await this.productRepository.findOne({
          where: { id: item.product.id }
        });
        
        if (product) {
          product.stock += item.quantity;
          await this.productRepository.save(product);
        }
      }

      await this.orderRepository.remove(cart);
      deletedCount++;
    }

    return deletedCount;
  }

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

  async createGuestOrder(dto: CreateGuestOrderDto, guestToken: string): Promise<{
    order: Order;
    paymentIntent?: any;
  }> {
    if (!guestToken || !guestToken.startsWith('guest_')) {
      throw new BadRequestException('Invalid guest token');
    }

    // Проверяем товары
    const productIds = dto.items.map(item => item.productId);
    const products = await this.productRepository
      .createQueryBuilder('product')
      .where('product.id IN (:...ids)', { ids: productIds })
      .getMany();

    if (products.length === 0) {
      throw new BadRequestException('No products found');
    }

    // Создаем заказ
    const order = await this.orderRepository.save(
      this.orderRepository.create({
        guestId: guestToken,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        orderNumber: this.generateOrderNumber(),
        deliveryType: dto.deliveryType,
        deliveryAddress: dto.deliveryAddress,
        customerName: dto.customerName,
        customerEmail: dto.customerEmail,
        customerPhone: dto.customerPhone,
        notes: dto.notes,
        totalAmount: dto.items.reduce((sum, item) => {
          const product = products.find(p => p.id === item.productId);
          return sum + (product?.price || item.unitPrice) * item.quantity;
        }, 0),
      })
    );

    // Создаем payment intent
    if (order.totalAmount > 0) {
      try {
        const orderNumber = order.orderNumber ? order.orderNumber : null;
        const paymentIntent = await this.stripeService.createPaymentIntent({
          orderId: order.id,
          orderNumber: orderNumber,
          amount: Math.round(order.totalAmount * 100),
          currency: 'usd',
          customerEmail: order.customerEmail,
          metadata: {
            orderId: order.id.toString(),
            guestToken,
          },
        });

        order.paymentIntentId = paymentIntent.paymentIntentId;
        await this.orderRepository.save(order);

        return {
          order,
          paymentIntent,
        };
      } catch (error) {
        console.warn('Payment intent creation failed:', error);
        return {
          order,
        };
      }
    }

    return {
      order,
    };
  }
}