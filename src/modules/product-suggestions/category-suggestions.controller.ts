import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductSuggestionsService } from './product-suggestions.service';


@ApiTags('category-suggestions')
@Controller('categories/:categoryId/products/suggestions')
export class CategorySuggestionsController {
  constructor(
    private readonly suggestionsService: ProductSuggestionsService,
  ) {}

  @Get('popular')
  @ApiOperation({ summary: 'Get popular products in category' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of products', example: 12 })
  @ApiQuery({ name: 'includeChildren', required: false, type: Boolean, description: 'Include subcategories', example: true })
  @ApiResponse({ status: 200, description: 'Popular products in category' })
  async getPopularInCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query('limit', new DefaultValuePipe(12), ParseIntPipe) limit: number,
    @Query('includeChildren', new DefaultValuePipe(true)) includeChildren: boolean,
  ) {
    return this.suggestionsService.getPopularInCategory(categoryId, limit, includeChildren);
  }
}