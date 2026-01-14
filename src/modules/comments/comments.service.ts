/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Comment, CommentType } from './entities/comment.entity';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Product } from '../products/entities/product.entity';
import { CommentWithRepliesDto } from './dtos/comment-with-replies.dto';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,

    private productsService: ProductsService,
    private usersService: UsersService,
  ) {}

  async findByProductId(
    productId: number, 
    type?: CommentType,
    page: number = 1,
    limit: number = 10,
    minRating?: number,
  ): Promise<{ 
    comments: CommentWithRepliesDto[]; 
    total: number;
    page: number;
    totalPages: number;
    statistics?: {
      averageRating: number;
      totalReviews: number;
      totalQuestions: number;
      verifiedPurchases: number;
    };
  }> {
    const skip = (page - 1) * limit;

    let statistics;
    if (page === 1) {
      statistics = await this.getProductCommentsStatistics(productId);
    }

    const queryBuilder = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .where('comment.product_id = :productId', { productId })
      .andWhere('comment.parent_id IS NULL')
      .orderBy('comment.created_at', 'DESC');

    if (type) {
      queryBuilder.andWhere('comment.type = :type', { type });
    }

    if (minRating !== undefined) {
      queryBuilder.andWhere('comment.rating >= :minRating', { minRating });
    }

    const [rootComments, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const rootIds = rootComments.map(c => c.id);
    let allReplies: Comment[] = [];
    
    if (rootIds.length > 0) {
      allReplies = await this.commentRepository.find({
        where: {
          parent: { id: In(rootIds) },
        },
        relations: ['author'],
        order: { createdAt: 'ASC' },
      });
    }

    const repliesMap = new Map<number, Comment[]>();
    for (const reply of allReplies) {
      const parentId = reply.parent!.id;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId)!.push(reply);
    }

    const comments = rootComments.map(comment => ({
      id: comment.id,
      content: comment.content,
      type: comment.type,
      rating: comment.rating,
      isVerifiedPurchase: comment.isVerifiedPurchase,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.author.id,
        name: comment.author.name,
        avatarUrl: comment.author.avatarUrl,
      },
      replies: (repliesMap.get(comment.id) || []).map(reply => ({
        id: reply.id,
        content: reply.content,
        type: reply.type,
        rating: reply.rating,
        isVerifiedPurchase: reply.isVerifiedPurchase,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        author: {
          id: reply.author.id,
          name: reply.author.name,
          avatarUrl: reply.author.avatarUrl,
        },
      })),
    }));

    return {
      comments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      statistics,
    };
  }

  async create(
    productId: number,
    authorId: number,
    createDto: CreateCommentDto,
  ): Promise<Comment> {
    const { content, type, rating } = createDto;

    if (!['review', 'question'].includes(type)) {
      throw new BadRequestException('Only "review" or "question" types are allowed for root comments');
    }

		// ВРЕМЕННО
    const isVerifiedPurchase = true;
    // if (type === 'review') {

    //   isVerifiedPurchase = await this.usersService.hasPurchasedProduct(authorId, productId);
      
    //   if (!isVerifiedPurchase) {
    //     throw new ForbiddenException('You must purchase the product to leave a review');
    //   }

    //   if (rating === undefined || rating < 0 || rating > 5) {
    //     throw new BadRequestException('Rating is required for reviews and must be between 0 and 5');
    //   }
    // } else if (rating !== undefined) {

    //   throw new BadRequestException('Rating is not allowed for questions');
    // }

    await this.productsService.findById(productId);
    await this.usersService.findById(authorId);

    const comment = this.commentRepository.create({
      content,
      type,
      rating: type === 'review' ? rating : undefined,
      isVerifiedPurchase,
      product: { id: productId } as Product,
      author: { id: authorId } as User,
      parent: undefined,
    });

    const savedComment = await this.commentRepository.save(comment);

    if (type === 'review') {
      await this.updateProductRating(productId);
    }

    return savedComment;
  }

  async replyToComment(
    parentId: number,
    authorId: number,
    content: string,
  ): Promise<Comment> {

    const parentComment = await this.commentRepository.findOne({
      where: { id: parentId },
      relations: ['product'],
    });
    
    if (!parentComment) {
      throw new NotFoundException(`Parent comment with ID ${parentId} not found`);
    }

    await this.usersService.findById(authorId);

    const reply = this.commentRepository.create({
      content,
      type: 'answer',
      rating: undefined,
      isVerifiedPurchase: false, 
      product: { id: parentComment.product.id } as Product,
      author: { id: authorId } as User,
      parent: { id: parentId } as Comment,
    });

    return this.commentRepository.save(reply);
  }

  async update(
    commentId: number,
    userId: number,
    updateDto: UpdateCommentDto,
  ): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author', 'product'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.author.id !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    if (comment.type === 'review' && updateDto.rating !== undefined) {
      comment.rating = updateDto.rating;

      await this.updateProductRating(comment.product.id);
    }

    if (updateDto.content) {
      comment.content = updateDto.content;
    }

    comment.updatedAt = new Date();
    return this.commentRepository.save(comment);
  }

  async remove(commentId: number, userId: number): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['author', 'replies'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.author.id !== userId) {
      // TODO: Добавить проверку на роль админа
      throw new ForbiddenException('You can only delete your own comments');
    }

    if (comment.replies && comment.replies.length > 0) {
      comment.content = '[Комментарий удален]';
      comment.updatedAt = new Date();
      await this.commentRepository.save(comment);
    } else {
      await this.commentRepository.remove(comment);

      if (comment.type === 'review' && comment.product) {
        await this.updateProductRating(comment.product.id);
      }
    }
  }

  async getProductCommentsStatistics(productId: number) {
    const reviews = await this.commentRepository.find({
      where: {
        product: { id: productId },
        type: 'review',
      },
    });

    const questions = await this.commentRepository.find({
      where: {
        product: { id: productId },
        type: 'question',
      },
    });

    const totalReviews = reviews.length;
    const totalQuestions = questions.length;
    
    const verifiedPurchases = reviews.filter(r => r.isVerifiedPurchase).length;
    
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
      : 0;

    return {
      averageRating: parseFloat(averageRating.toFixed(2)),
      totalReviews,
      totalQuestions,
      verifiedPurchases,
    };
  }

  private async updateProductRating(productId: number): Promise<void> {
		const result = await this.commentRepository
			.createQueryBuilder('comment')
			.select('AVG(comment.rating)', 'averageRating')
			.addSelect('COUNT(comment.id)', 'reviewCount')
			.where('comment.product_id = :productId', { productId })
			.andWhere('comment.type = :type', { type: 'review' })
			.andWhere('comment.rating IS NOT NULL')
			.getRawOne();

		if (result && result.reviewCount > 0) {
			const averageRating = parseFloat(result.averageRating) || 0;

			await this.productsService.updateProductRating(productId, averageRating);
		}
	}
}