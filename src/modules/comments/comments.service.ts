/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException, 
	Logger
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment, CommentType } from './entities/comment.entity';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Product } from '../products/entities/product.entity';
// import { CommentWithRepliesDto } from './dtos/comment-with-replies.dto';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';

@Injectable()
export class CommentsService {
	private readonly logger = new Logger(CommentsService.name);
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
	): Promise<any> {
		const skip = (page - 1) * limit;
		
		try {
			// 1. Получаем корневые комментарии
			let query = `
				SELECT 
					c.id,
					c.content,
					c.type,
					c.rating,
					c.is_verified_purchase as "isVerifiedPurchase",
					c.created_at as "createdAt",
					c.updated_at as "updatedAt",
					u.id as "authorId",
					u.name as "authorName",
					u.avatar_url as "authorAvatarUrl"
				FROM comments c
				LEFT JOIN users u ON c.author_id = u.id
				WHERE c.product_id = $1 
					AND c.parent_id IS NULL
			`;
			
			const params: any[] = [productId];
			
			if (type) {
				params.push(type);
				query += ` AND c.type = $${params.length}`;
			}
			
			if (minRating !== undefined && type === 'review') {
				params.push(minRating);
				query += ` AND c.rating >= $${params.length}`;
			}
			
			query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
			params.push(limit, skip);
			
			const rootComments = await this.commentRepository.query(query, params);
			
			// 2. Получаем общее количество
			let countQuery = `
				SELECT COUNT(*) as total 
				FROM comments c
				WHERE c.product_id = $1 
					AND c.parent_id IS NULL
			`;
			
			const countParams: any[] = [productId];
			
			if (type) {
				countParams.push(type);
				countQuery += ` AND c.type = $${countParams.length}`;
			}
			
			if (minRating !== undefined && type === 'review') {
				countParams.push(minRating);
				countQuery += ` AND c.rating >= $${countParams.length}`;
			}
			
			const countResult = await this.commentRepository.query(countQuery, countParams);
			const total = parseInt(countResult[0].total);
			
			// 3. Получаем ответы, если есть корневые комментарии
			let allReplies: any[] = [];
			if (rootComments.length > 0) {
				const rootIds = rootComments.map(c => c.id);
				const repliesQuery = `
					SELECT 
						c.id,
						c.content,
						c.type,
						c.rating,
						c.is_verified_purchase as "isVerifiedPurchase",
						c.created_at as "createdAt",
						c.updated_at as "updatedAt",
						c.parent_id as "parentId",
						u.id as "authorId",
						u.name as "authorName",
						u.avatar_url as "authorAvatarUrl"
					FROM comments c
					LEFT JOIN users u ON c.author_id = u.id
					WHERE c.parent_id = ANY($1)
					ORDER BY c.created_at ASC
				`;
				
				allReplies = await this.commentRepository.query(repliesQuery, [rootIds]);
			}
			
			// 4. Группируем ответы
			const repliesMap = new Map<number, any[]>();
			for (const reply of allReplies) {
				const parentId = reply.parentId;
				if (!repliesMap.has(parentId)) {
					repliesMap.set(parentId, []);
				}
				repliesMap.get(parentId)!.push({
					id: reply.id,
					content: reply.content,
					type: reply.type,
					rating: reply.rating,
					isVerifiedPurchase: reply.isVerifiedPurchase,
					createdAt: reply.createdAt,
					updatedAt: reply.updatedAt,
					author: {
						id: reply.authorId,
						name: reply.authorName,
						avatarUrl: reply.authorAvatarUrl,
					},
				});
			}
			
			// 5. Форматируем результат
			const comments = rootComments.map(comment => ({
				id: comment.id,
				content: comment.content,
				type: comment.type,
				rating: comment.rating,
				isVerifiedPurchase: comment.isVerifiedPurchase,
				createdAt: comment.createdAt,
				updatedAt: comment.updatedAt,
				author: {
					id: comment.authorId,
					name: comment.authorName,
					avatarUrl: comment.authorAvatarUrl,
				},
				replies: repliesMap.get(comment.id) || [],
			}));
			
			// 6. Получаем статистику
			const statistics = await this.getProductCommentsStatistics(productId);
			
			return {
				comments,
				total,
				page,
				totalPages: Math.ceil(total / limit),
				statistics,
			};
		} catch (error) {
			this.logger.error(`Error loading comments for product ${productId}:`, error);
			throw new BadRequestException('Failed to load comments');
		}
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

  private async getProductCommentsStatistics(productId: number) {
		try {
			// 1. Статистика отзывов
			const reviewsQuery = `
				SELECT 
					COUNT(*) as "totalReviews",
					AVG(rating) as "averageRating",
					COUNT(CASE WHEN is_verified_purchase = true THEN 1 END) as "verifiedPurchases"
				FROM comments 
				WHERE product_id = $1 
					AND type = 'review'
					AND parent_id IS NULL
			`;

			const reviewsResult = await this.commentRepository.query(reviewsQuery, [productId]);
			
			// 2. Статистика вопросов
			const questionsQuery = `
				SELECT COUNT(*) as "totalQuestions"
				FROM comments 
				WHERE product_id = $1 
					AND type = 'question'
					AND parent_id IS NULL
			`;

			const questionsResult = await this.commentRepository.query(questionsQuery, [productId]);

			const totalReviews = parseInt(reviewsResult[0]?.totalReviews || '0');
			const averageRating = parseFloat(reviewsResult[0]?.averageRating || '0');
			const verifiedPurchases = parseInt(reviewsResult[0]?.verifiedPurchases || '0');
			const totalQuestions = parseInt(questionsResult[0]?.totalQuestions || '0');

			return {
				averageRating: isNaN(averageRating) ? 0 : parseFloat(averageRating.toFixed(2)),
				totalReviews,
				totalQuestions,
				verifiedPurchases,
			};
		} catch (error) {
			this.logger.error(`Error loading statistics for product ${productId}:`, error);
			// Возвращаем пустую статистику вместо ошибки
			return {
				averageRating: 0,
				totalReviews: 0,
				totalQuestions: 0,
				verifiedPurchases: 0,
			};
		}
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