import { ApiProperty } from '@nestjs/swagger';
import { BaseCommentDto } from './base.dto';
import { CommentReplyDto } from './comment-reply.dto';

export class CommentWithRepliesDto extends BaseCommentDto {
  @ApiProperty({ type: () => [CommentReplyDto] })
  replies: CommentReplyDto[];
}