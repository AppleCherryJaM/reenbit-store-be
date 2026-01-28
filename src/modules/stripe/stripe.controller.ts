import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { CreatePaymentIntentDto } from './dtos/create-payment-intent.dto';

interface RequestWithUser extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Stripe Payment Intent',
    description: 'Creates a payment intent for processing card payments',
  })
  @ApiBody({ type: CreatePaymentIntentDto })
  @ApiOkResponse({
    description: 'Payment intent created successfully',
    schema: {
      example: {
        clientSecret: 'pi_xxx_secret_xxx',
        paymentIntentId: 'pi_xxx',
        amount: 5000,
        currency: 'usd',
        status: 'requires_payment_method',
      },
    },
  })
  async createPaymentIntent(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.stripeService.createPaymentIntent({
      ...createPaymentIntentDto,
      customerEmail: req.user.email,
      metadata: {
        userId: req.user.id.toString(),
        userName: req.user.name,
      },
    });
  }

  @Get('payment-intent/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get Payment Intent status',
    description: 'Retrieve the current status of a payment intent',
  })
  @ApiOkResponse({
    description: 'Payment intent details',
  })
  async getPaymentIntent(@Param('id') paymentIntentId: string) {
    return this.stripeService.retrievePaymentIntent(paymentIntentId);
  }

  @Post('verify-payment/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify Payment',
    description: 'Verify if payment was successful on Stripe side',
  })
  async verifyPayment(@Param('id') paymentIntentId: string) {
    const result = await this.stripeService.verifyPayment(paymentIntentId);
    
    if (!result.valid) {
      throw new BadRequestException(`Payment not valid. Status: ${result.status}`);
    }

    return {
      success: true,
      message: 'Payment verified successfully',
      data: result,
    };
  }

  @Post('confirm-payment/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm Payment on Server',
    description: 'Manually confirm a payment intent on server side',
  })
  async confirmPayment(@Param('id') paymentIntentId: string) {
    const success = await this.stripeService.confirmPaymentOnServer(paymentIntentId);
    
    if (!success) {
      throw new BadRequestException('Payment confirmation failed');
    }

    return { 
      success: true, 
      message: 'Payment confirmed successfully' 
    };
  }

  @Post('cancel-payment/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel Payment Intent',
    description: 'Cancel a payment intent before it is captured',
  })
  async cancelPayment(@Param('id') paymentIntentId: string) {
    const success = await this.stripeService.cancelPaymentIntent(paymentIntentId);
    
    if (!success) {
      throw new BadRequestException('Payment cancellation failed');
    }

    return { 
      success: true, 
      message: 'Payment cancelled successfully' 
    };
  }

  @Get('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Stripe public configuration',
    description: 'Returns public Stripe configuration for frontend',
  })
  getConfig() {
    return this.stripeService.getPublicConfig();
  }
}