import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import stripeConfig from './stripe.config';
import { RawBodyMiddleware } from '@/common/middlewares/raw-body.middleware';

@Module({
  imports: [ConfigModule.forFeature(stripeConfig)],
  providers: [StripeService],
  controllers: [StripeController],
  exports: [StripeService],
})
export class StripeModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes({ path: 'stripe/webhook', method: RequestMethod.POST });
  }
}