import { Type } from "class-transformer";
import { IsInt, Min, IsArray, ValidateNested, IsEnum, IsOptional, IsString } from "class-validator";
import { DeliveryType } from "../types/order.types";

export class OrderItemDto {
  @IsInt()
  @Min(1)
  productId: number;
  
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(DeliveryType)
  deliveryType: DeliveryType;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;
}