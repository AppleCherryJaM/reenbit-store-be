import { IsString, IsOptional, IsEmail, IsPhoneNumber, IsEnum, ValidateNested, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType } from '../types/order.types';

export class CheckoutItemDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class DeliveryInfoDto {
  @IsEnum(DeliveryType)
  type: DeliveryType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  timeSlot?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CheckoutDto {
  @IsOptional()
  @IsString()
  guestId?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @IsOptional()
  @IsPhoneNumber()
  customerPhone?: string;

  @ValidateNested()
  @Type(() => DeliveryInfoDto)
  deliveryInfo: DeliveryInfoDto;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}