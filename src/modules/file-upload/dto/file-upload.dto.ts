import { ApiProperty } from '@nestjs/swagger';

export class UploadProductImagesDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Product images (max 10 files)',
  })
  images: any[];
}