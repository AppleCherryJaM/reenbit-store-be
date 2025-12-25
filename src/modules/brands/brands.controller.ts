import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { Brand } from './entities/brand.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all brands' })
  @ApiResponse({ status: 200, description: 'List of brands', type: [Brand] })
  findAll(): Promise<Brand[]> {
    return this.brandsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get brand by ID' })
  @ApiResponse({ status: 200, description: 'Brand found', type: Brand })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  findById(@Param('id', ParseIntPipe) id: number): Promise<Brand> {
    return this.brandsService.findById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post()
  @ApiOperation({ summary: 'Create brand' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, type: Brand })
  create(@Body('name') name: string): Promise<Brand> {
    return this.brandsService.create(name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  @ApiOperation({ summary: 'Update brand' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, type: Brand })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  @ApiResponse({ status: 409, description: 'Brand name already exists' })
  update(@Param('id', ParseIntPipe) id: number, @Body('name') name: string): Promise<Brand> {
    return this.brandsService.update(id, name);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete brand' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Brand deleted' })
  @ApiResponse({ status: 404, description: 'Brand not found' })
  delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.brandsService.delete(id);
  }
}
