import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
  ) {}

  async findOrCreateByName(name: string) {
    if (!name?.trim()) {
      throw new Error('Brand name is required');
    }
    const cleanName = name.trim();

    let brand = await this.brandRepository.findOne({ where: { name: cleanName } });
    if (!brand) {
      brand = this.brandRepository.create({ name: cleanName });
      await this.brandRepository.save(brand);
    }
    return brand;
  }

  async findById(id: number): Promise<Brand> {
    const brand = await this.brandRepository.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    return brand;
  }

  async findAll(): Promise<Brand[]> {
    return this.brandRepository.find();
  }
}