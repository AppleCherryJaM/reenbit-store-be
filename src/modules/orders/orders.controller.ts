import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';

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

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my orders' })
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
  async getOrder(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOrderById(id);
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create test order (for development)' })
  @ApiResponse({ status: 201, description: 'Test order created' })
  async createTestOrder(
    @Req() req: AuthenticatedRequest,
    @Body('productId', ParseIntPipe) productId: number,
  ) {
    const userId = req.user.id;
    return this.ordersService.createTestOrder(userId, productId);
  }
}