import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsController, CommentRepliesController } from './comments.controller';
import { Comment } from './entities/comment.entity';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
    ProductsModule,
    UsersModule,
  ],
  providers: [CommentsService],
  controllers: [CommentsController, CommentRepliesController],
  exports: [CommentsService],
})
export class CommentsModule {}