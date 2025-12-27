import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async findById(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async findOrCreateByName(name: string): Promise<Category> {
    if (!name?.trim()) {
      throw new Error('Category name is required');
    }
    const cleanName = name.trim();

    let category = await this.categoryRepository.findOne({ where: { name: cleanName } });
    if (!category) {
      category = this.categoryRepository.create({ name: cleanName });
      await this.categoryRepository.save(category);
    }
    return category;
  }

  async bulkFindOrCreateCategories(names: string[]): Promise<Category[]> {

    const existing = await this.categoryRepository.find({ where: { name: In(names) } });

    const existingNames = new Set(existing.map(c => c.name));
    const toCreate = names.filter(name => !existingNames.has(name));

    if (toCreate.length > 0) {
      const created = await this.categoryRepository.save(
        toCreate.map(name => this.categoryRepository.create({ name }))
      );
      existing.push(...created);
    }

    return existing;
  }

  async create(name: string, description?: string): Promise<Category> {
    const existing = await this.categoryRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException(`Category "${name}" already exists`);
    }
    const category = this.categoryRepository.create({ name, description });
    return this.categoryRepository.save(category);
  }

  async update(id: number, name?: string, description?: string): Promise<Category> {
    const category = await this.findById(id);

    if (name !== undefined) {
      const existing = await this.categoryRepository.findOne({ where: { name } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Category "${name}" already exists`);
      }
      category.name = name;
    }

    if (description !== undefined) {
      category.description = description;
    }

    return this.categoryRepository.save(category);
  }

  async delete(id: number): Promise<void> {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
  }
}