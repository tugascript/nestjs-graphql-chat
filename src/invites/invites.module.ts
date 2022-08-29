import { forwardRef, Module } from '@nestjs/common';
import { ChatsModule } from '../chats/chats.module';
import { UsersModule } from '../users/users.module';
import { InvitesResolver } from './invites.resolver';
import { InvitesService } from './invites.service';

@Module({
  imports: [forwardRef(() => ChatsModule), forwardRef(() => UsersModule)],
  providers: [InvitesResolver, InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
