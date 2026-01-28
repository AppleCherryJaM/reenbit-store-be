import { ApiProperty } from '@nestjs/swagger';
import { 
  IsEmail, 
  IsString, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsNumber, 
  Min, 
  IsEnum 
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType } from '../types/order.types';

class GuestOrderItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: 1,
  })
  @IsNumber()
  productId: number;

  @ApiProperty({
    description: 'Quantity',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Unit price in USD',
    example: 19.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateGuestOrderDto {
  @ApiProperty({
    description: 'Delivery type',
    enum: DeliveryType,
    example: DeliveryType.DELIVERY,
  })
  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @ApiProperty({
    description: 'Delivery address',
    example: '123 Main St, New York, NY 10001',
    required: false,
  })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiProperty({
    description: 'Customer full name',
    example: 'John Doe',
  })
  @IsString()
  customerName: string;

  @ApiProperty({
    description: 'Customer email',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({
    description: 'Customer phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Please deliver after 5 PM',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Order items',
    type: [GuestOrderItemDto],
    example: [
      { productId: 1, quantity: 2, unitPrice: 19.99 },
      { productId: 3, quantity: 1, unitPrice: 49.99 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestOrderItemDto)
  items: GuestOrderItemDto[];
}