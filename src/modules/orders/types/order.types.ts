export enum OrderStatus {
	CART = 'cart',      
	PENDING = 'pending',
	PROCESSING = 'processing',
	SHIPPED = 'shipped',    
	DELIVERED = 'delivered',
	CANCELLED = 'cancelled',
	COMPLETED = 'completed',
}

export enum DeliveryType {
	PICKUP = 'pickup',    
	DELIVERY = 'delivery',
	EXPRESS = 'express',  
}