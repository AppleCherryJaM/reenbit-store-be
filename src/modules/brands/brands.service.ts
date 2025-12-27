import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  async bulkFindOrCreateBrands(names: string[]): Promise<Brand[]> {
    const existing = await this.brandRepository.findBy({ name: In(names) });
    const existingNames = new Set(existing.map(b => b.name));
    const toCreate = names
      .filter(name => !existingNames.has(name))
      .map(name => this.brandRepository.create({ name }));

    if (toCreate.length > 0) {
      const created = await this.brandRepository.save(toCreate, { chunk: 100 });
      existing.push(...created);
    }
    
    return existing;
  }

  async create(name: string): Promise<Brand> {
    const existing = await this.brandRepository.findOne({ where: { name } });
    
    if (existing) {
      throw new ConflictException(`Brand "${name}" already exists`);
    }
    
    const brand = this.brandRepository.create({ name });
    return this.brandRepository.save(brand);
  }

  async update(id: number, name: string): Promise<Brand> {
    const brand = await this.findById(id);

    const existing = await this.brandRepository.findOne({ where: { name } });
    
    if (existing && existing.id !== id) {
      throw new ConflictException(`Brand "${name}" already exists`);
    }

    brand.name = name;
    return this.brandRepository.save(brand);
  }

  async delete(id: number): Promise<void> {
    const result = await this.brandRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
  }
}