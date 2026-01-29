import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface CreatePaymentIntentParams {
  orderId: number;
  orderNumber: string | null;
  amount: number; // In cents
  currency?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: Stripe.PaymentIntent.Status;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private stripe: Stripe;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initializeStripe();
  }

  private initializeStripe() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    
    if (!secretKey) {
      this.logger.warn('⚠️ STRIPE_SECRET_KEY is not set. Stripe service will not work.');
      return;
    }

    try {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-12-15.clover',
      });
      this.isConfigured = true;
      this.logger.log('✅ Stripe service initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Stripe:', error);
    }
  }

  private ensureConfigured() {
    if (!this.stripe || !this.isConfigured) {
      throw new BadRequestException('Stripe service is not configured. Please set STRIPE_SECRET_KEY.');
    }
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
		this.ensureConfigured();

		try {
			const paymentIntent = await this.stripe.paymentIntents.create({
				amount: params.amount,
				currency: params.currency || 'usd',
				metadata: {
					orderId: params.orderId.toString(),
					orderNumber: params.orderNumber,
					...params.metadata,
				},
				receipt_email: params.customerEmail,
				payment_method_types: ['card'],
				description: `Payment for order ${params.orderNumber}`,
				confirm: false,
			});

			this.logger.log(`Payment intent created: ${paymentIntent.id} for order ${params.orderNumber}`);

			return {
				clientSecret: paymentIntent.client_secret!,
				paymentIntentId: paymentIntent.id,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
				status: paymentIntent.status,
			};
		} catch (error: any) {
			this.logger.error('Stripe payment intent creation failed:', error);
			throw new BadRequestException(`Payment creation failed: ${error}`);
		}
	}

  async confirmPaymentOnServer(paymentIntentId: string): Promise<boolean> {
    this.ensureConfigured();

    try {
      // Получаем актуальный статус
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        this.logger.log(`✅ Payment already succeeded: ${paymentIntentId}`);
        return true;
      }

      // Если еще не оплачено, пробуем подтвердить
      if (paymentIntent.status === 'requires_confirmation') {
        const confirmed = await this.stripe.paymentIntents.confirm(paymentIntentId);
        return confirmed.status === 'succeeded';
      }

      this.logger.warn(`Payment in unexpected state: ${paymentIntent.status}`);
      return false;
    } catch (error: any) {
      this.logger.error('Payment confirmation error:', error);
      return false;
    }
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<{
		id: string;
		status: string;
		amount: number;
		currency: string;
		metadata: any;
		succeeded: boolean;
	}> {
		this.ensureConfigured();

		try {
			const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
			
			return {
				id: paymentIntent.id,
				status: paymentIntent.status,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
				metadata: paymentIntent.metadata,
				succeeded: paymentIntent.status === 'succeeded',
			};
		} catch (error: any) {
			this.logger.error('Failed to retrieve payment intent:', error);
			throw new BadRequestException(`Failed to retrieve payment: ${error}`);
		}
	}

  async cancelPaymentIntent(paymentIntentId: string): Promise<boolean> {
    this.ensureConfigured();

    try {
      await this.stripe.paymentIntents.cancel(paymentIntentId);
      this.logger.log(`Payment cancelled: ${paymentIntentId}`);
      return true;
    } catch (error: any) {
      this.logger.error('Payment cancellation error:', error);
      return false;
    }
  }

	async verifyPayment(paymentIntentId: string): Promise<{
		valid: boolean;
		status: string;
		amount: number;
		orderId?: string;
	}> {
		this.ensureConfigured();

		try {
			console.log(`🔍 Verifying payment intent: ${paymentIntentId}`);
			
			const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
			
			console.log(`📊 Payment intent status: ${paymentIntent.status}`);
			console.log(`💰 Amount: ${paymentIntent.amount}`);
			console.log(`📝 Metadata:`, paymentIntent.metadata);
			
			const result = {
				valid: paymentIntent.status === 'succeeded',
				status: paymentIntent.status,
				amount: paymentIntent.amount,
				orderId: paymentIntent.metadata?.orderId,
			};
			
			console.log('✅ Verification result:', result);
			
			return result;
		} catch (error) {
			console.error('❌ Payment verification failed:', error);
			return {
				valid: false,
				status: 'error',
				amount: 0,
			};
		}
	}

  getPublicConfig() {
    const publishableKey = this.configService.get<string>('STRIPE_PUBLISHABLE_KEY');

    return {
      publishableKey: publishableKey || null,
      isConfigured: this.isConfigured,
      currency: this.configService.get<string>('STRIPE_CURRENCY') || 'usd',
    };
  }

  isServiceAvailable(): boolean {
    return this.isConfigured;
  }
}