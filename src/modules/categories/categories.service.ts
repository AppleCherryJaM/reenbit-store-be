import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository, Brackets } from 'typeorm';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: TreeRepository<Category>,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      order: { orderIndex: 'ASC', name: 'ASC' },
    });
  }

  async findById(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ 
      where: { id },
      relations: ['parent', 'children'] 
    });
    
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

    let category = await this.categoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name: cleanName })
      .andWhere('category.parent IS NULL')
      .getOne();

    if (!category) {
      category = this.categoryRepository.create({ name: cleanName });
      await this.categoryRepository.save(category);
    }
    return category;
  }

  async bulkFindOrCreateCategories(names: string[]): Promise<Category[]> {
    if (names.length === 0) return [];

    const cleanNames = names.map(name => name.trim());

    const existing = await this.categoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) IN (:...names)', { 
        names: cleanNames.map(name => name.toLowerCase()) 
      })
      .andWhere('category.parent IS NULL')
      .getMany();

    const existingNames = new Set(existing.map(c => c.name.toLowerCase()));
    const toCreate = cleanNames.filter(name => !existingNames.has(name.toLowerCase()));

    if (toCreate.length > 0) {
      const created = await this.categoryRepository.save(
        toCreate.map(name => this.categoryRepository.create({ name }))
      );
      existing.push(...created);
    }

    return existing;
  }

  async create(name: string, description?: string): Promise<Category> {

    const existing = await this.categoryRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name: name.trim() })
      .andWhere('category.parent IS NULL')
      .getOne();
    
    if (existing) {
      throw new ConflictException(`Category "${name}" already exists`);
    }
    
    const category = this.categoryRepository.create({ name, description });
    return this.categoryRepository.save(category);
  }

  async update(id: number, name?: string, description?: string): Promise<Category> {
    const category = await this.findById(id);

    if (name !== undefined) {
      const cleanName = name.trim();

      const existing = await this.categoryRepository
        .createQueryBuilder('category')
        .where('LOWER(category.name) = LOWER(:name)', { name: cleanName })
        .andWhere('category.id != :id', { id })
        .andWhere('category.parent IS NULL')
        .getOne();
      
      if (existing) {
        throw new ConflictException(`Category "${name}" already exists`);
      }
      category.name = cleanName;
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

  async getTree(): Promise<Category[]> {
    return this.categoryRepository.findTrees();
  }

  async getRootCategories(): Promise<Category[]> {
    return this.categoryRepository.findRoots();
  }

  async getChildren(parentId: number): Promise<Category[]> {
    const parent = await this.findById(parentId);
    const children = await this.categoryRepository.findDescendants(parent);

    return children.filter(child => {
      const childLevel = child.level !== undefined ? child.level : 0;
      const parentLevel = parent.level !== undefined ? parent.level : -1;
      return childLevel === parentLevel + 1;
    });
  }

  async createSubcategory(
    parentId: number,
    name: string,
    description?: string
  ): Promise<Category> {
    const parent = await this.findById(parentId);

    const existing = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .where('LOWER(category.name) = LOWER(:name)', { name: name.trim() })
      .andWhere('parent.id = :parentId', { parentId })
      .getOne();
    
    if (existing) {
      throw new ConflictException(`Subcategory "${name}" already exists in this category`);
    }
    
    const category = this.categoryRepository.create({ 
      name, 
      description, 
      parent 
    });
    
    return this.categoryRepository.save(category);
  }

  async search(query: string): Promise<Category[]> {
    if (!query?.trim() || query.trim().length < 2) {
      return [];
    }

    return this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.parent', 'parent')
      .where(
        new Brackets(qb => {
          qb.where('LOWER(category.name) LIKE LOWER(:query)', { query: `%${query}%` })
            .orWhere('LOWER(category.description) LIKE LOWER(:query)', { query: `%${query}%` });
        })
      )
      .andWhere('category.isActive = :isActive', { isActive: true })
      .orderBy('category.level', 'ASC')
      .addOrderBy('category.orderIndex', 'ASC')
      .take(20)
      .getMany();
  }

  getRepository(): TreeRepository<Category> {
    return this.categoryRepository;
  }

  async findByIdWithDescendants(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({ 
      where: { id },
      relations: ['parent'] 
    });
    
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.categoryRepository.findDescendantsTree(category);
  }

  async getBreadcrumbs(id: number): Promise<Category[]> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent'],
    });
    
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const breadcrumbs: Category[] = [];
    let current: Category | null = category;
    
    while (current) {
      breadcrumbs.unshift(current);
      current = current.parent;
    }
    
    return breadcrumbs;
  }

  async getAllDescendantIds(id: number): Promise<number[]> {
    const category = await this.findById(id);
    const descendants = await this.categoryRepository.findDescendants(category);

    const ids = descendants.map(descendant => descendant.id);

    if (!ids.includes(id)) {
      ids.push(id);
    }
    
    return ids;
  }

  async isDescendant(parentId: number, childId: number): Promise<boolean> {
    if (parentId === childId) return false;
    
    const parent = await this.findById(parentId);
    const descendants = await this.categoryRepository.findDescendants(parent);
    
    return descendants.some(descendant => descendant.id === childId);
  }

  async getAllParents(id: number): Promise<Category[]> {
    const breadcrumbs = await this.getBreadcrumbs(id);

    return breadcrumbs.slice(0, -1);
  }

   async getFullPath(id: number, separator: string = ' > '): Promise<string> {
    const breadcrumbs = await this.getBreadcrumbs(id);
    return breadcrumbs.map(cat => cat.name).join(separator);
  }

   async exists(id: number): Promise<boolean> {
    const count = await this.categoryRepository.count({ where: { id } });
    return count > 0;
  }

  async getDepth(id: number): Promise<number> {
    const category = await this.categoryRepository.findOne({ 
      where: { id },
      select: ['level'] 
    });
    
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    
    return category.level || 0;
  }
}