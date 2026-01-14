/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
  DefaultValuePipe,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';
import { Request } from 'express';

import { CommentsService } from './comments.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

@Controller('products/:productId/comments')
@ApiTags('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all comments (reviews/questions) for a product' })
  @ApiQuery({ name: 'type', required: false, enum: ['review', 'question'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'minRating', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of comments' })
  async getComments(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('type') type?: 'review' | 'question',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('minRating') minRating?: number,
  ) {
    return this.commentsService.findByProductId(productId, type, page, limit, minRating);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new review or question for a product' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 403, description: 'User must purchase product to leave a review' })
  async createComment(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() createDto: CreateCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const authorId = req.user.id;
    return this.commentsService.create(productId, authorId, createDto);
  }

  @Patch(':commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment' })
  @ApiResponse({ status: 200, description: 'Comment updated' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your comment' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateComment(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateDto: UpdateCommentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.commentsService.update(commentId, userId, updateDto);
  }

  @Delete(':commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your comment' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    return this.commentsService.remove(commentId, userId);
  }
}

@Controller('comments/:commentId/reply')
@ApiTags('comments')
export class CommentRepliesController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a comment (question or review)' })
  @ApiResponse({ status: 201, description: 'Reply created' })
  async createReply(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body('content') content: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const authorId = req.user.id;
    return this.commentsService.replyToComment(commentId, authorId, content);
  }
}