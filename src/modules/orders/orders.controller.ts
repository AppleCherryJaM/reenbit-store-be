import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dtos/create-order.dto';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { Order } from './entities/order.entity';
import { CreateGuestOrderDto } from './dtos/create-guest-order.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get('cart')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user cart' })
  @ApiResponse({ status: 200, description: 'User cart details' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async getCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.ordersService.getCart(userId);
  }

  @Post('cart/add')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Insufficient stock' })
  @ApiBody({ type: AddToCartDto })
  async addToCart(
    @Req() req: AuthenticatedRequest,
    @Body() addToCartDto: AddToCartDto,
  ) {
    const userId = req.user.id;
    
    if (addToCartDto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }
    
    return this.ordersService.addToCart(
      userId, 
      addToCartDto.productId, 
      addToCartDto.quantity
    );
  }

  @Put('cart/update/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiResponse({ status: 200, description: 'Cart item updated' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', example: 3 },
      },
      required: ['quantity'],
    },
  })
  async updateCartItem(
    @Req() req: AuthenticatedRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body('quantity', ParseIntPipe) quantity: number,
  ) {
    const userId = req.user.id;
    
    if (quantity < 0) {
      throw new BadRequestException('Quantity cannot be negative');
    }
    
    return this.ordersService.updateCartItem(userId, itemId, quantity);
  }

  @Delete('cart/remove/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async removeFromCart(
    @Req() req: AuthenticatedRequest,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    const userId = req.user.id;
    return this.ordersService.removeFromCart(userId, itemId);
  }

  @Delete('cart/clear')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared' })
  async clearCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.ordersService.clearCart(userId);
  }

  @Post('cart/checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Checkout cart and create order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Cart is empty' })
  async checkoutCart(
    @Req() req: AuthenticatedRequest,
    @Body() deliveryInfo: Partial<CreateOrderDto>,
  ) {
    const userId = req.user.id;
    return this.ordersService.checkoutCart(userId, deliveryInfo);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order data' })
  @ApiBody({ type: CreateOrderDto })
  async createOrder(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
  ) {
    const userId = req.user.id;
    return this.ordersService.createOrder(userId, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my orders (excluding cart)' })
  @ApiResponse({ status: 200, description: 'List of user orders' })
  async getMyOrders(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.ordersService.getUserOrders(userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.ordersService.findOrderById(id, userId);
  }

  @Post('guest-checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create order as guest' })
  @ApiBody({ type: CreateGuestOrderDto })
  async guestCheckout(
    @Body() createGuestOrderDto: CreateGuestOrderDto,
    @Headers('x-guest-token') guestToken: string
  ) {
    return this.ordersService.createGuestOrder(createGuestOrderDto, guestToken);
  }

  @Post('guest-order/:id/process-payment')
  async processGuestOrderPayment(
    @Param('id', ParseIntPipe) orderId: number,
    @Body('paymentIntentId') paymentIntentId: string,
    @Body('guestToken') guestToken: string,
  ) {
    console.log(`🎫 [CONTROLLER] Guest payment endpoint HIT! order=${orderId}, intent=${paymentIntentId}`);
    console.log(`🎫 Guest token: ${guestToken}`);
    
    return this.ordersService.processGuestPayment(orderId, paymentIntentId, guestToken);
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create test order (for development)' })
  @ApiResponse({ status: 201, description: 'Test order created' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        productId: { type: 'number', example: 1 },
      },
      required: ['productId'],
    },
  })
  async createTestOrder(
    @Req() req: AuthenticatedRequest,
    @Body('productId', ParseIntPipe) productId: number,
  ) {
    const userId = req.user.id;
    let result: Order|null|{ message: string; status: number } = null;
    try {
      result = await this.ordersService.createTestOrder(userId, productId);
    } catch (error) {
      result = {message: `Error: ${error}`, status: 500}
    }
    return result;
  }

  @Post(':id/process-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  async processOrderPayment(
    @Param('id', ParseIntPipe) orderId: number,
    @Body('paymentIntentId') paymentIntentId: string,
  ) {
    return this.ordersService.processOrderPayment(orderId, paymentIntentId);
  }
}