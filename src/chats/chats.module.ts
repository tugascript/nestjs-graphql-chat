import { forwardRef, Module } from '@nestjs/common';
import { EncryptionModule } from '../encryption/encryption.module';
import { MessagesModule } from '../messages/messages.module';
import { UsersModule } from '../users/users.module';
import { ChatsService } from './chats.service';
import { ChatsResolver } from './resolvers/chats.resolver';
import { ProfilesResolver } from './resolvers/profiles.resolver';

@Module({
  imports: [UsersModule, EncryptionModule, forwardRef(() => MessagesModule)],
  providers: [ChatsResolver, ChatsService, ProfilesResolver],
  exports: [ChatsService],
})
export class ChatsModule {}
