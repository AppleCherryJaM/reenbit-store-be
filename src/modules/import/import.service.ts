/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { BrandsService } from '../brands/brands.service';
import { CategoriesService } from '../categories/categories.service';

interface YmlOffer {
  '@_id'?: string;
  name?: string;
  description?: string;
  price?: string;
  '@_available'?: string;
  picture?: string | string[];
  categoryId?: string;
  vendor?: string;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private categoriesService: CategoriesService,
    private brandsService: BrandsService,
  ) {}

  async importFromXml(xmlContent: string): Promise<{ categories: number; brands: number; errors: number }> {
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

    let offers: YmlOffer[] = [];
    if (parsedData.yml_catalog?.shop?.offers?.offer) {
      const offerData = parsedData.yml_catalog.shop.offers.offer;
      offers = Array.isArray(offerData) ? offerData : [offerData];
    } else {
      throw new Error('Unsupported format: expected YML (Yandex Market) with English tags');
    }

    const seenCategories = new Set<string>();
    const seenBrands = new Set<string>();
    let errors = 0;

    for (const offer of offers) {
      try {

        if (offer.vendor) {
          seenBrands.add(offer.vendor.trim());
        }

        if (offer.categoryId) {

          seenCategories.add(offer.categoryId.trim());
        }
      } catch (error) {
        errors++;
        this.logger.warn(`Failed to process offer`, { error });
      }
    }

    let brandCount = 0;
    for (const brandName of seenBrands) {
      try {
        await this.brandsService.findOrCreateByName(brandName);
        brandCount++;
      } catch (error) {
        errors++;
        this.logger.warn(`Brand creation failed: ${brandName}`, error);
      }
    }

    let categoryCount = 0;
    for (const categoryName of seenCategories) {
      try {
        await this.categoriesService.findOrCreateByName(categoryName);
        categoryCount++;
      } catch (error) {
        errors++;
        this.logger.warn(`Category creation failed: ${categoryName}`, error);
      }
    }

    return { categories: categoryCount, brands: brandCount, errors };
  }
}