import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'List of categories', type: [Category] })
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category found', type: Category })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findById(@Param('id', ParseIntPipe) id: number): Promise<Category> {
    return this.categoriesService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @ApiOperation({ summary: 'Create category' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: Category })
  create(
    @Body('name') name: string,
    @Body('description') description?: string,
  ): Promise<Category> {
    return this.categoriesService.create(name, description);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: Category })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category name already exists' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name?: string,
    @Body('description') description?: string,
  ): Promise<Category> {
    return this.categoriesService.update(id, name, description);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.categoriesService.delete(id);
  }

  @Get('tree/all')
  @ApiOperation({ summary: 'Get full category tree' })
  @ApiResponse({ status: 200, description: 'Category tree', type: [Category] })
  getTree(): Promise<Category[]> {
    return this.categoriesService.getTree();
  }

  @Get('tree/roots')
  @ApiOperation({ summary: 'Get root categories for navigation' })
  @ApiResponse({ status: 200, description: 'Root categories', type: [Category] })
  getRootCategories(): Promise<Category[]> {
    return this.categoriesService.getRootCategories();
  }

  @Get('tree/:id/children')
  @ApiOperation({ summary: 'Get children of category' })
  @ApiResponse({ status: 200, description: 'Children categories', type: [Category] })
  @ApiResponse({ status: 404, description: 'Category not found' })
  getChildren(@Param('id', ParseIntPipe) id: number): Promise<Category[]> {
    return this.categoriesService.getChildren(id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search categories' })
  @ApiResponse({ status: 200, description: 'Search results', type: [Category] })
  search(@Query('q') query: string): Promise<Category[]> {
    return this.categoriesService.search(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post(':id/subcategories')
  @ApiOperation({ summary: 'Create subcategory' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: Category })
  createSubcategory(
    @Param('id', ParseIntPipe) parentId: number,
    @Body('name') name: string,
    @Body('description') description?: string,
  ): Promise<Category> {
    return this.categoriesService.createSubcategory(parentId, name, description);
  }
}