export enum OrderStatus {
  CART = 'cart',      
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',    
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  PAID = 'paid',
}

export enum DeliveryType {
  PICKUP = 'pickup',    
  DELIVERY = 'delivery',
  EXPRESS = 'express',  
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}