import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from '../products/products.service';
import { ProductSuggestionsService } from './product-suggestions.service';


@ApiTags('products')
@Controller('products/:id/suggestions')
export class ProductSuggestionsController {
  constructor(
    private readonly suggestionsService: ProductSuggestionsService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get product suggestions' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of suggestions', example: 6 })
  @ApiQuery({ name: 'includeBrand', required: false, type: Boolean, description: 'Include same brand', example: true })
  @ApiQuery({ name: 'minRating', required: false, type: Number, description: 'Minimum rating', example: 4.0 })
  async getSuggestions(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
    @Query('includeBrand', new DefaultValuePipe(true), ParseBoolPipe) includeBrand: boolean,
    @Query('minRating', new DefaultValuePipe(4.0)) minRating: number,
  ) {

    const product = await this.productsService.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const suggestions = await this.suggestionsService.getSuggestions(id, {
      limit,
      includeBrand,
      minRating,
    });

    return {
      productId: id,
      productName: product.name,
      suggestions,
      total: Object.values(suggestions).reduce((sum, arr) => sum + arr.length, 0),
    };
  }

  @Get('similar')
  @ApiOperation({ summary: 'Get similar products by categories' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  @ApiQuery({ name: 'includeBrand', required: false, type: Boolean, example: true })
  async getSimilar(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
    @Query('includeBrand', new DefaultValuePipe(true), ParseBoolPipe) includeBrand: boolean,
  ) {
    return this.suggestionsService.getSimilarProducts(id, limit, includeBrand);
  }

  @Get('frequently-bought')
  @ApiOperation({ summary: 'Get products frequently bought together' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 4 })
  async getFrequentlyBought(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
  ) {
    return this.suggestionsService.getFrequentlyBoughtTogether(id, limit);
  }

  @Get('price-range')
  @ApiOperation({ summary: 'Get similar products in the same price range' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  @ApiQuery({ name: 'rangePercent', required: false, type: Number, example: 30 })
  async getPriceRangeSimilar(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new DefaultValuePipe(6), ParseIntPipe) limit: number,
    @Query('rangePercent', new DefaultValuePipe(30), ParseIntPipe) rangePercent: number,
  ) {
    return this.suggestionsService.findPriceRangeSimilar(id, limit, rangePercent);
  }
}