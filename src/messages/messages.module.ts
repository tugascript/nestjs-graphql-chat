import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesResolver } from './messages.resolver';

@Module({
  providers: [MessagesResolver, MessagesService]
})
export class MessagesModule {}
