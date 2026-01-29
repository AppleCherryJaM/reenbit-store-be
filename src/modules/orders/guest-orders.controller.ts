import { Controller, Post, Param, ParseIntPipe, Body } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";

// guest-orders.controller.ts
@Controller('orders/guest')
@ApiTags('orders')
export class GuestOrdersController {
  constructor(private ordersService: OrdersService) {}
  
  @Post(':id/process-payment')
  async processPayment(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() body: { paymentIntentId: string; guestToken: string },
  ) {
    console.log(`🎫 Guest payment endpoint called!`);
    return this.ordersService.processGuestPayment(
      orderId, 
      body.paymentIntentId, 
      body.guestToken
    );
  }
}