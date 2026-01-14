import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { MailService } from '../mail/mail.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    OrdersModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, MailService],
  exports: [UsersService, TypeOrmModule, MailService],
})
export class UsersModule {}