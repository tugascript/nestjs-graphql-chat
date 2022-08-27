import { forwardRef, Module } from '@nestjs/common';
import { ChatsModule } from '../chats/chats.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { MessagesResolver } from './messages.resolver';
import { MessagesService } from './messages.service';

@Module({
  imports: [EncryptionModule, forwardRef(() => ChatsModule)],
  providers: [MessagesResolver, MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
