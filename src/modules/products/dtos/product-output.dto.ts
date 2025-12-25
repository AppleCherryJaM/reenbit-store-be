import { Product } from "../entities/product.entity";

export type ProductOutputDto = { 
	message: string, 
	status: number, 
	result: Product | null 
};

export type ProductArrayOutputDto = { 
	message: string, 
	status: number, 
	result: Array<Product> | null 
};