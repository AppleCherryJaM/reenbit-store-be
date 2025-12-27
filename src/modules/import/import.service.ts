/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { ProductsService } from '../products/products.service';
import { XmlProductDto } from './dto/xml-product.dto';

interface YmlOffer {
  '@_id'?: string;
  name?: string;
  description?: string;
  price?: string;
  '@_available'?: string;
  picture?: string | string[];
  categoryId?: string | number | (string | number)[];
  vendor?: string;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private productsService: ProductsService,
  ) {}

  private extractImages(offer: YmlOffer): string[] {
    if (!offer.picture) return [];
    const pictures = Array.isArray(offer.picture) ? offer.picture : [offer.picture];
    return pictures
      .map(url => url?.trim())
      .filter(url => url && url.length > 0);
  }

  private parseCategories(parsedData: any): Map<string, string> {
    const categoryMap = new Map<string, string>();

    const categoriesNode = parsedData.yml_catalog?.shop?.categories?.category;
    
    if (!categoriesNode) return categoryMap;

    const categories = Array.isArray(categoriesNode) ? categoriesNode : [categoriesNode];
    
    for (const cat of categories) {
      const ymlId = cat['@_id']?.toString();

      let name = '';
      
      if (typeof cat === 'string') {
        name = cat;
      } else if (typeof cat === 'object' && cat !== null) {
        name = cat['#text'] || cat['_'] || JSON.stringify(cat); // fallback
      }

      if (ymlId && name) {
        categoryMap.set(ymlId, name.trim());
      }
    }

    return categoryMap;
  }

  async importFromXml(xmlContent: string): Promise<{ products: number; errors: number }> {
    const parserOptions = {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
    };

    const parser = new XMLParser(parserOptions);
    let parsedData: any;

    try {
      parsedData = parser.parse(xmlContent);
    } catch (error) {
      this.logger.error('Failed to parse XML', error);
      throw new Error('Invalid XML format');
    }

    const ymlCategoryMap = this.parseCategories(parsedData);

    let offers: YmlOffer[] = [];
    if (parsedData.yml_catalog?.shop?.offers?.offer) {
      const offerData = parsedData.yml_catalog.shop.offers.offer;
      offers = Array.isArray(offerData) ? offerData : [offerData];
    } else {
      throw new Error('Unsupported format: expected YML (Yandex Market)');
    }

    let errors = 0;
    const productsToUpsert = [] as Array<XmlProductDto>;

    for (const offer of offers) {
      try {
        let rawCategoryIds = offer.categoryId;
        if (rawCategoryIds == null) {
          rawCategoryIds = ['Uncategorized'];
        } else if (!Array.isArray(rawCategoryIds)) {
          rawCategoryIds = [rawCategoryIds];
        }

        const categoryNames = rawCategoryIds.map(id => {
          const idStr = String(id).trim();
          return ymlCategoryMap.get(idStr) || idStr;
        });

        productsToUpsert.push({
          name: (offer.name ?? 'Unnamed Product').trim(),
          description: (offer.description ?? '').trim(),
          price: parseFloat(offer.price ?? '0') || 0,
          stock: parseInt(offer['@_available'] ?? '0', 10) || 0,
          images: this.extractImages(offer),
          categoryNames,
          brandName: (offer.vendor ?? 'Unknown Brand').trim(),
        });
      } catch (error) {
        errors++;
        this.logger.warn(`Parse error: ${error.message}`, { offer });
      }
    }

    try {
      await this.productsService.bulkUpsert(productsToUpsert);
      return { products: productsToUpsert.length, errors };
    } catch (error) {
      this.logger.error('Bulk import failed', error);
      return { products: 0, errors: productsToUpsert.length + errors };
    }
  }
}