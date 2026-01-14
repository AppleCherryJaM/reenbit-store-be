import { Product } from "@/modules/products/entities/product.entity";
import { User } from "@/modules/users/user.entity";

export type CommentType = 'review' | 'question' | 'answer';

export interface Comment {
	id: number;
	content: string; 
	type: CommentType; // 'review', 'question', 'answer'

	productId: number;
	product?: Product;         

	authorId: number;
	author?: User;

	parentId?: number | null;  
	parent?: Comment;          

	rating?: number | null;    
	isVerifiedPurchase?: boolean; 

	createdAt: string;         
	updatedAt?: string;
}