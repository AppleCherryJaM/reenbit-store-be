import { Product } from "../entities/product.entity";

export type ProductArrayOutputDto = { 
	message: string, 
	status: number, 
	result: Array<Product> | null 
};