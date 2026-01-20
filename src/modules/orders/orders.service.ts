import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, Not } from "typeorm";
import { Product } from "../products/entities/product.entity";
import { CreateOrderDto } from "./dtos/create-order.dto";
import { OrderItem } from "./entities/order-item.entity";
import { Order } from "./entities/order.entity";
import { OrderStatus, DeliveryType } from "./types/order.types";

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

  async checkoutCart(userId: number, deliveryInfo: Partial<CreateOrderDto>): Promise<Order> {
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
    
    if (deliveryInfo.deliveryType) {
      cart.deliveryType = deliveryInfo.deliveryType;
    }
    
    if (deliveryInfo.deliveryAddress) {
      cart.deliveryAddress = deliveryInfo.deliveryAddress;
    }

    return this.orderRepository.save(cart);
  }

  async createOrder(userId: number, dto: CreateOrderDto): Promise<Order> {
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

    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        user: { id: userId },
        status: OrderStatus.PENDING,
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  async createTestOrder(userId: number, productId: number): Promise<Order> {
    const product = await this.productRepository.findOneBy({ id: productId });
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    return this.createOrder(userId, {
      items: [{ productId, quantity: 1 }],
      deliveryType: DeliveryType.PICKUP,
      deliveryAddress: 'Test address',
    });
  }

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }


  async cleanupOldCarts(days: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldCarts = await this.orderRepository.find({
      where: { 
        status: OrderStatus.CART,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        createdAt: { $lt: cutoffDate } as any
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
  // async getOrderStatuses(): Promise<typeof OrderStatus> {
  //   const res = await OrderStatus
  //   return OrderStatus;
  // }

  // async getDeliveryTypes(): Promise<typeof DeliveryType> {
  //   const res = await DeliveryType
  //   return DeliveryType;
  // }
}