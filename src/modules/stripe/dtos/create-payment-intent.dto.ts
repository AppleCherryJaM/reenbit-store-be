import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min, IsEnum } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Order ID',
    example: 123,
  })
  @IsNumber()
  orderId: number;

  @ApiProperty({
    description: 'Order number',
    example: 'ORD-2024-001',
  })
  @IsString()
  orderNumber: string;

  @ApiProperty({
    description: 'Amount in cents (e.g., 5000 = $50.00)',
    example: 5000,
    minimum: 50,
  })
  @IsNumber()
  @Min(50, { message: 'Amount must be at least 50 cents ($0.50)' })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'usd',
    default: 'usd',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsEnum(['usd', 'eur', 'gbp', 'cad', 'aud'], {
    message: 'Currency must be one of: usd, eur, gbp, cad, aud',
  })
  currency?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { customField: 'value' },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, string>;

  @ApiProperty({
    description: 'Guest token for guest checkout',
    example: 'guest_1740774400000_abc123xyz',
    required: false,
  })
  @IsOptional()
  @IsString()
  guestToken?: string;
}