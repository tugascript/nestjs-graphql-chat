import { forwardRef, Module } from '@nestjs/common';
import { EncryptionModule } from '../encryption/encryption.module';
import { InvitesModule } from '../invites/invites.module';
import { MessagesModule } from '../messages/messages.module';
import { UsersModule } from '../users/users.module';
import { ChatsService } from './chats.service';
import { ChatsResolver } from './resolvers/chats.resolver';
import { ProfilesResolver } from './resolvers/profiles.resolver';

@Module({
  imports: [
    EncryptionModule,
    forwardRef(() => UsersModule),
    forwardRef(() => MessagesModule),
    forwardRef(() => InvitesModule),
  ],
  providers: [ChatsResolver, ChatsService, ProfilesResolver],
  exports: [ChatsService],
})
export class ChatsModule {}
