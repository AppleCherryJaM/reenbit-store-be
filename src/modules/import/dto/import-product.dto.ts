export class ImportProductDto {
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  categoryId: number; 
  brandId: number;    
}